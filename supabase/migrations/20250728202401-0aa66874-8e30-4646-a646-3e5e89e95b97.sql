
-- Créer la table pour stocker les tokens temporaires
CREATE TABLE public.unsubscribe_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days')
);

-- Ajouter les politiques RLS pour unsubscribe_tokens
ALTER TABLE public.unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent gérer les tokens de leur tenant
CREATE POLICY "Users can manage their tenant unsubscribe tokens" 
  ON public.unsubscribe_tokens 
  FOR ALL 
  USING (tenant_id = (
    SELECT u.tenant_id 
    FROM users u 
    WHERE u.id = auth.uid()
  ));

-- Politique publique pour permettre la lecture des tokens (pour validation)
CREATE POLICY "Public can read unsubscribe tokens" 
  ON public.unsubscribe_tokens 
  FOR SELECT 
  USING (expires_at > now());

-- Modifier la fonction process_unsubscription
CREATE OR REPLACE FUNCTION public.process_unsubscription(
  p_token TEXT,
  p_email TEXT,
  p_tenant_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record RECORD;
  v_unsubscribe_id UUID;
BEGIN
  -- Vérifier que le token existe et n'a pas expiré
  SELECT token, email, tenant_id, campaign_id, expires_at 
  INTO v_token_record
  FROM public.unsubscribe_tokens
  WHERE token = p_token 
    AND expires_at > now();
  
  -- Si le token n'existe pas ou a expiré
  IF v_token_record.token IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token de désabonnement invalide ou expiré'
    );
  END IF;
  
  -- Vérifier que l'email et tenant_id correspondent au token
  IF v_token_record.email != p_email OR v_token_record.tenant_id != p_tenant_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email ou tenant incorrect pour ce token'
    );
  END IF;
  
  -- Insérer ou mettre à jour l'enregistrement de désabonnement
  INSERT INTO public.unsubscriptions (
    tenant_id,
    email,
    campaign_id,
    unsubscribe_token,
    reason,
    ip_address,
    user_agent
  ) VALUES (
    p_tenant_id,
    p_email,
    COALESCE(p_campaign_id, v_token_record.campaign_id),
    p_token,
    p_reason,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (tenant_id, email) 
  DO UPDATE SET
    reason = EXCLUDED.reason,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    created_at = now()
  RETURNING id INTO v_unsubscribe_id;
  
  -- Ajouter à la blacklist
  INSERT INTO public.blacklists (
    tenant_id,
    type,
    value,
    reason,
    category,
    created_by
  ) VALUES (
    p_tenant_id,
    'email',
    p_email,
    COALESCE(p_reason, 'Désabonnement automatique'),
    'manual',
    '00000000-0000-0000-0000-000000000000'::UUID -- ID système pour les désabonnements automatiques
  )
  ON CONFLICT (tenant_id, type, value) DO NOTHING;
  
  -- Mettre à jour le statut du contact
  UPDATE public.contacts 
  SET status = 'unsubscribed'
  WHERE tenant_id = p_tenant_id AND email = p_email;
  
  -- Supprimer le token utilisé pour éviter les réutilisations
  DELETE FROM public.unsubscribe_tokens 
  WHERE token = p_token;
  
  RETURN jsonb_build_object(
    'success', true,
    'unsubscribe_id', v_unsubscribe_id,
    'message', 'Désabonnement traité avec succès'
  );
END;
$$;

-- Fonction pour créer un token de désabonnement (à utiliser lors de l'envoi de campagne)
CREATE OR REPLACE FUNCTION public.create_unsubscribe_token(
  p_email TEXT,
  p_tenant_id UUID,
  p_campaign_id UUID DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Générer un token unique
  v_token := public.generate_unsubscribe_token(p_email, p_tenant_id, p_campaign_id);
  
  -- Insérer le token dans la table temporaire
  INSERT INTO public.unsubscribe_tokens (
    token,
    email,
    tenant_id,
    campaign_id
  ) VALUES (
    v_token,
    p_email,
    p_tenant_id,
    p_campaign_id
  )
  ON CONFLICT (token) DO NOTHING;
  
  RETURN v_token;
END;
$$;

-- Index pour améliorer les performances
CREATE INDEX idx_unsubscribe_tokens_token ON public.unsubscribe_tokens(token);
CREATE INDEX idx_unsubscribe_tokens_email_tenant ON public.unsubscribe_tokens(email, tenant_id);
CREATE INDEX idx_unsubscribe_tokens_expires ON public.unsubscribe_tokens(expires_at);

-- Fonction pour nettoyer les tokens expirés (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION public.cleanup_expired_unsubscribe_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.unsubscribe_tokens 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;
