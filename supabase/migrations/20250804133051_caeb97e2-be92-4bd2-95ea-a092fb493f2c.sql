-- ÉTAPE 1: Extension de la table tenants pour tracking personnalisé
ALTER TABLE tenants ADD COLUMN tracking_domain TEXT;
ALTER TABLE tenants ADD COLUMN unsubscribe_page_config JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN brand_config JSONB DEFAULT '{}';

-- ÉTAPE 2: Tracking des ouvertures PAR TENANT
CREATE TABLE email_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email_queue_id UUID REFERENCES email_queue(id),
  campaign_id UUID REFERENCES campaigns(id),
  contact_email TEXT NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  device_type TEXT,
  email_client TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ÉTAPE 3: Tracking des clics PAR TENANT  
CREATE TABLE email_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email_queue_id UUID REFERENCES email_queue(id),
  campaign_id UUID REFERENCES campaigns(id),
  contact_email TEXT NOT NULL,
  original_url TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ÉTAPE 4: Désabonnements PAR TENANT
CREATE TABLE unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_email TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, contact_email)
);

-- ÉTAPE 5: Tokens sécurisés PAR TENANT
CREATE TABLE tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  token TEXT UNIQUE NOT NULL,
  email_queue_id UUID REFERENCES email_queue(id),
  campaign_id UUID REFERENCES campaigns(id),
  contact_email TEXT NOT NULL,
  token_type TEXT CHECK (token_type IN ('open', 'click', 'unsubscribe')) NOT NULL,
  original_url TEXT, -- pour les clics
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ÉTAPE 6: Row Level Security sur toutes les nouvelles tables
ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour email_opens
CREATE POLICY "tenant_isolation_opens" ON email_opens
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Politique RLS pour email_clicks  
CREATE POLICY "tenant_isolation_clicks" ON email_clicks
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Politique RLS pour unsubscribes
CREATE POLICY "tenant_isolation_unsubscribes" ON unsubscribes
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Politique RLS pour tracking_tokens
CREATE POLICY "tenant_isolation_tracking_tokens" ON tracking_tokens
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Politique publique pour tracking (sans auth)
CREATE POLICY "public_tracking_access" ON tracking_tokens
  FOR SELECT USING (expires_at > now());

CREATE POLICY "public_opens_insert" ON email_opens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_clicks_insert" ON email_clicks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_unsubscribes_insert" ON unsubscribes
  FOR INSERT WITH CHECK (true);

-- ÉTAPE 7: Fonctions utilitaires
CREATE OR REPLACE FUNCTION generate_tracking_token(
  p_tenant_id UUID,
  p_email_queue_id UUID,
  p_campaign_id UUID,
  p_contact_email TEXT,
  p_token_type TEXT,
  p_original_url TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Générer un token sécurisé unique
  v_token := encode(
    digest(
      p_tenant_id::text || 
      p_email_queue_id::text || 
      p_contact_email || 
      p_token_type ||
      extract(epoch from now())::text || 
      gen_random_uuid()::text, 
      'sha256'
    ), 
    'hex'
  );
  
  -- Insérer le token dans la table
  INSERT INTO tracking_tokens (
    tenant_id,
    token,
    email_queue_id,
    campaign_id,
    contact_email,
    token_type,
    original_url
  ) VALUES (
    p_tenant_id,
    v_token,
    p_email_queue_id,
    p_campaign_id,
    p_contact_email,
    p_token_type,
    p_original_url
  );
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;