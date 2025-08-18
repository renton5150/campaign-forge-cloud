-- Corriger la fonction de mise en queue pour utiliser html_content
CREATE OR REPLACE FUNCTION public.queue_campaign_for_sending(p_campaign_id uuid, p_contact_list_ids uuid[])
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
  v_empty_lists_count INTEGER := 0;
BEGIN
  -- Récupérer la campagne
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campaign not found'
    );
  END IF;
  
  -- Si aucune liste fournie, utiliser celles associées à la campagne
  IF array_length(p_contact_list_ids, 1) IS NULL OR array_length(p_contact_list_ids, 1) = 0 THEN
    SELECT array_agg(list_id) INTO p_contact_list_ids
    FROM public.campaign_lists
    WHERE campaign_id = p_campaign_id;
    
    -- Si toujours aucune liste
    IF array_length(p_contact_list_ids, 1) IS NULL OR array_length(p_contact_list_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Aucune liste de contacts associée à cette campagne'
      );
    END IF;
  END IF;
  
  -- Récupérer les emails blacklistés pour ce tenant
  CREATE TEMP TABLE temp_blacklist AS
  SELECT DISTINCT value as email
  FROM public.blacklists
  WHERE tenant_id = v_campaign.tenant_id
    AND type = 'email';
  
  -- Pour chaque contact des listes sélectionnées
  FOR v_contact IN 
    SELECT DISTINCT c.* 
    FROM public.contacts c
    JOIN public.contact_list_memberships clm ON c.id = clm.contact_id
    WHERE clm.list_id = ANY(p_contact_list_ids)
    AND c.status = 'active'
    AND c.tenant_id = v_campaign.tenant_id
  LOOP
    -- Vérifier si l'email est blacklisté
    IF EXISTS (SELECT 1 FROM temp_blacklist WHERE email = v_contact.email) THEN
      v_blacklist_count := v_blacklist_count + 1;
      CONTINUE;
    END IF;
    
    -- Générer message_id unique
    v_message_id := p_campaign_id::text || '-' || v_contact.id::text || '-' || extract(epoch from now())::bigint::text || '-' || substr(md5(random()::text), 1, 8);
    
    -- Vérifier si pas déjà en queue (protection anti-doublon)
    IF NOT EXISTS (
      SELECT 1 FROM public.email_queue 
      WHERE campaign_id = p_campaign_id 
      AND contact_email = v_contact.email
      AND status IN ('pending', 'processing', 'sent')
    ) THEN
      -- Ajouter à la queue avec html_content
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
        COALESCE(
          NULLIF(trim(concat(v_contact.first_name, ' ', v_contact.last_name)), ''),
          v_contact.email
        ),
        v_campaign.subject,
        v_campaign.html_content, -- CORRECTION: utiliser html_content au lieu de content
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
  
  -- Nettoyer la table temporaire
  DROP TABLE temp_blacklist;
  
  -- Construire le message de retour
  DECLARE
    v_message TEXT;
  BEGIN
    v_message := v_queued_count || ' emails mis en queue';
    
    IF v_duplicate_count > 0 THEN
      v_message := v_message || ', ' || v_duplicate_count || ' doublons ignorés';
    END IF;
    
    IF v_blacklist_count > 0 THEN
      v_message := v_message || ', ' || v_blacklist_count || ' emails blacklistés ignorés';
    END IF;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'queued_emails', v_queued_count,
    'duplicates_skipped', v_duplicate_count,
    'blacklisted_skipped', v_blacklist_count,
    'message', v_message
  );
END;
$function$;