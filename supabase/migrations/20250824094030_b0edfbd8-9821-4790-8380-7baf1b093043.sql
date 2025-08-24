-- Add detailed logging to queue_campaign_for_sending for diagnostics only (no logic change)
CREATE OR REPLACE FUNCTION public.queue_campaign_for_sending(p_campaign_id uuid, p_contact_list_ids uuid[] DEFAULT NULL::uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_campaign campaigns%ROWTYPE;
  v_contact contacts%ROWTYPE;
  v_message_id TEXT;
  v_queued_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_blacklist_count INTEGER := 0;
  v_final_list_ids uuid[];
  v_message TEXT;
  v_contact_count INTEGER := 0;
BEGIN
  RAISE NOTICE '[queue_campaign] Start campaign_id=%', p_campaign_id;

  -- Récupérer la campagne
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE NOTICE '[queue_campaign] Campaign not found';
    RETURN jsonb_build_object('success', false, 'error', 'Campagne non trouvée');
  END IF;
  RAISE NOTICE '[queue_campaign] Campaign tenant_id=%, scheduled_at=%', v_campaign.tenant_id, v_campaign.scheduled_at;

  -- Si aucune liste fournie, utiliser celles associées à la campagne
  IF p_contact_list_ids IS NULL OR array_length(p_contact_list_ids, 1) IS NULL OR array_length(p_contact_list_ids, 1) = 0 THEN
    SELECT array_agg(list_id) INTO v_final_list_ids
    FROM public.campaign_lists
    WHERE campaign_id = p_campaign_id;

    IF v_final_list_ids IS NULL OR array_length(v_final_list_ids, 1) IS NULL OR array_length(v_final_list_ids, 1) = 0 THEN
      RAISE NOTICE '[queue_campaign] No lists associated to campaign';
      RETURN jsonb_build_object('success', false, 'error', 'Aucune liste de contacts associée à cette campagne');
    END IF;
  ELSE
    v_final_list_ids := p_contact_list_ids;
  END IF;
  RAISE NOTICE '[queue_campaign] Using % list(s): %', COALESCE(array_length(v_final_list_ids,1),0), v_final_list_ids;

  -- Emails blacklistés (tenant ou globaux)
  CREATE TEMP TABLE IF NOT EXISTS temp_blacklist AS
  SELECT DISTINCT value AS email
  FROM public.blacklists
  WHERE type = 'email'
    AND (tenant_id = v_campaign.tenant_id OR tenant_id IS NULL);
  RAISE NOTICE '[queue_campaign] Temp blacklist created';

  -- Compter les contacts éligibles avant boucle
  SELECT COUNT(DISTINCT c.id) INTO v_contact_count
  FROM public.contacts c
  JOIN public.contact_list_memberships clm ON c.id = clm.contact_id
  WHERE clm.list_id = ANY(v_final_list_ids)
    AND c.status = 'active'
    AND (c.tenant_id = v_campaign.tenant_id OR (c.tenant_id IS NULL AND v_campaign.tenant_id IS NULL));
  RAISE NOTICE '[queue_campaign] Eligible contacts count=%', v_contact_count;

  -- Boucle sur les contacts des listes
  FOR v_contact IN 
    SELECT DISTINCT c.*
    FROM public.contacts c
    JOIN public.contact_list_memberships clm ON c.id = clm.contact_id
    WHERE clm.list_id = ANY(v_final_list_ids)
      AND c.status = 'active'
      AND (c.tenant_id = v_campaign.tenant_id OR (c.tenant_id IS NULL AND v_campaign.tenant_id IS NULL))
  LOOP
    -- Ignorer si blacklisté
    IF EXISTS (SELECT 1 FROM temp_blacklist WHERE email = v_contact.email) THEN
      v_blacklist_count := v_blacklist_count + 1;
      CONTINUE;
    END IF;

    -- Générer un message_id
    v_message_id := p_campaign_id::text || '-' || v_contact.id::text || '-' || extract(epoch from now())::bigint::text || '-' || substr(md5(random()::text), 1, 8);

    -- Protection anti-doublon
    IF NOT EXISTS (
      SELECT 1 FROM public.email_queue 
      WHERE campaign_id = p_campaign_id 
        AND contact_email = v_contact.email
        AND status IN ('pending', 'processing', 'sent')
    ) THEN
      INSERT INTO public.email_queue (
        campaign_id,
        contact_email,
        contact_name,
        subject,
        html_content,
        status,
        message_id,
        scheduled_for,
        retry_count
      ) VALUES (
        p_campaign_id,
        v_contact.email,
        COALESCE(NULLIF(trim(concat(v_contact.first_name, ' ', v_contact.last_name)), ''), v_contact.email),
        v_campaign.subject,
        v_campaign.html_content,
        'pending',
        v_message_id,
        COALESCE(v_campaign.scheduled_at, now()),
        0
      );
      v_queued_count := v_queued_count + 1;
    ELSE
      v_duplicate_count := v_duplicate_count + 1;
    END IF;
  END LOOP;

  -- Nettoyage
  DROP TABLE IF EXISTS temp_blacklist;

  -- Message final
  v_message := v_queued_count || ' emails mis en queue';
  IF v_duplicate_count > 0 THEN
    v_message := v_message || ', ' || v_duplicate_count || ' doublons ignorés';
  END IF;
  IF v_blacklist_count > 0 THEN
    v_message := v_message || ', ' || v_blacklist_count || ' emails blacklistés ignorés';
  END IF;

  RAISE NOTICE '[queue_campaign] Done. queued=%, duplicates=%, blacklisted=%', v_queued_count, v_duplicate_count, v_blacklist_count;

  RETURN jsonb_build_object(
    'success', true,
    'queued_emails', v_queued_count,
    'duplicates_skipped', v_duplicate_count,
    'blacklisted_skipped', v_blacklist_count,
    'message', v_message
  );
END;
$function$;