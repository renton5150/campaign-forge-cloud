
-- Créer les tables pour le système de campagnes email

-- Table des listes de contacts
CREATE TABLE public.contact_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    total_contacts INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des contacts
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    company TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)
);

-- Table de liaison contacts-listes
CREATE TABLE public.contact_list_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    added_by UUID NOT NULL REFERENCES public.users(id),
    UNIQUE(contact_id, list_id)
);

-- Table des templates d'emails
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'custom',
    html_content TEXT NOT NULL,
    preview_text TEXT,
    is_system_template BOOLEAN DEFAULT false,
    thumbnail_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des campagnes
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    preview_text TEXT,
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    reply_to TEXT,
    html_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'archived')),
    template_id UUID REFERENCES public.email_templates(id),
    
    -- Planification
    scheduled_at TIMESTAMP WITH TIME ZONE,
    timezone TEXT DEFAULT 'UTC',
    
    -- Test A/B
    is_ab_test BOOLEAN DEFAULT false,
    ab_subject_b TEXT,
    ab_split_percentage INTEGER DEFAULT 50 CHECK (ab_split_percentage BETWEEN 1 AND 99),
    ab_winner_criteria TEXT DEFAULT 'open_rate' CHECK (ab_winner_criteria IN ('open_rate', 'click_rate')),
    ab_test_duration_hours INTEGER DEFAULT 24,
    
    -- Métadonnées
    tags TEXT[],
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Table des listes assignées aux campagnes
CREATE TABLE public.campaign_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, list_id)
);

-- Table des envois individuels
CREATE TABLE public.campaign_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
    bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    ab_variant TEXT DEFAULT 'A' CHECK (ab_variant IN ('A', 'B')),
    UNIQUE(campaign_id, contact_id)
);

-- Table des événements de tracking
CREATE TABLE public.campaign_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    send_id UUID NOT NULL REFERENCES public.campaign_sends(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'unsubscribe', 'complaint')),
    event_data JSONB DEFAULT '{}', -- URL cliquée, user agent, etc.
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des pièces jointes
CREATE TABLE public.campaign_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes pour les performances
CREATE INDEX idx_contacts_tenant_email ON public.contacts(tenant_id, email);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_campaigns_tenant_status ON public.campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_campaign_sends_status ON public.campaign_sends(status);
CREATE INDEX idx_campaign_events_type_created ON public.campaign_events(event_type, created_at);
CREATE INDEX idx_campaign_events_campaign_contact ON public.campaign_events(campaign_id, contact_id);

-- Activer RLS sur toutes les tables
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_list_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour contact_lists
CREATE POLICY "Users can view their tenant contact lists" ON public.contact_lists
    FOR SELECT USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "Users can manage their tenant contact lists" ON public.contact_lists
    FOR ALL USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

-- RLS Policies pour contacts
CREATE POLICY "Users can view their tenant contacts" ON public.contacts
    FOR SELECT USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "Users can manage their tenant contacts" ON public.contacts
    FOR ALL USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

-- RLS Policies pour contact_list_memberships
CREATE POLICY "Users can view their tenant memberships" ON public.contact_list_memberships
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.contact_lists cl WHERE cl.id = list_id 
                AND cl.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    );

CREATE POLICY "Users can manage their tenant memberships" ON public.contact_list_memberships
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.contact_lists cl WHERE cl.id = list_id 
                AND cl.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    );

-- RLS Policies pour email_templates
CREATE POLICY "Users can view templates" ON public.email_templates
    FOR SELECT USING (
        is_system_template = true 
        OR tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    );

CREATE POLICY "Users can manage their tenant templates" ON public.email_templates
    FOR ALL USING (
        tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    );

-- RLS Policies pour campaigns
CREATE POLICY "Users can view their tenant campaigns" ON public.campaigns
    FOR SELECT USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY "Users can manage their tenant campaigns" ON public.campaigns
    FOR ALL USING (tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()));

-- RLS Policies similaires pour les autres tables liées aux campagnes
CREATE POLICY "Users can view their campaigns data" ON public.campaign_lists
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id 
                AND c.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    );

CREATE POLICY "Users can view their campaigns sends" ON public.campaign_sends
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id 
                AND c.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    );

CREATE POLICY "Users can view their campaigns events" ON public.campaign_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id 
                AND c.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()))
    );

-- Triggers pour updated_at
CREATE TRIGGER update_contact_lists_updated_at 
    BEFORE UPDATE ON public.contact_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour calculer les statistiques d'une campagne
CREATE OR REPLACE FUNCTION public.get_campaign_stats(campaign_id_param UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'total_sent', (
            SELECT COUNT(*) FROM public.campaign_sends 
            WHERE campaign_id = campaign_id_param AND status IN ('sent', 'delivered')
        ),
        'delivered', (
            SELECT COUNT(*) FROM public.campaign_sends 
            WHERE campaign_id = campaign_id_param AND status = 'delivered'
        ),
        'bounced', (
            SELECT COUNT(*) FROM public.campaign_sends 
            WHERE campaign_id = campaign_id_param AND status = 'bounced'
        ),
        'hard_bounces', (
            SELECT COUNT(*) FROM public.campaign_sends 
            WHERE campaign_id = campaign_id_param AND status = 'bounced' AND bounce_type = 'hard'
        ),
        'soft_bounces', (
            SELECT COUNT(*) FROM public.campaign_sends 
            WHERE campaign_id = campaign_id_param AND status = 'bounced' AND bounce_type = 'soft'
        ),
        'unique_opens', (
            SELECT COUNT(DISTINCT contact_id) FROM public.campaign_events 
            WHERE campaign_id = campaign_id_param AND event_type = 'open'
        ),
        'total_opens', (
            SELECT COUNT(*) FROM public.campaign_events 
            WHERE campaign_id = campaign_id_param AND event_type = 'open'
        ),
        'unique_clicks', (
            SELECT COUNT(DISTINCT contact_id) FROM public.campaign_events 
            WHERE campaign_id = campaign_id_param AND event_type = 'click'
        ),
        'total_clicks', (
            SELECT COUNT(*) FROM public.campaign_events 
            WHERE campaign_id = campaign_id_param AND event_type = 'click'
        ),
        'unsubscribes', (
            SELECT COUNT(*) FROM public.campaign_events 
            WHERE campaign_id = campaign_id_param AND event_type = 'unsubscribe'
        ),
        'complaints', (
            SELECT COUNT(*) FROM public.campaign_events 
            WHERE campaign_id = campaign_id_param AND event_type = 'complaint'
        )
    );
$$;

-- Insérer quelques templates de base
INSERT INTO public.email_templates (name, description, category, html_content, is_system_template, thumbnail_url) VALUES
('Newsletter Simple', 'Template basique pour newsletter', 'newsletter', 
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{subject}}</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #333;">{{title}}</h1><div style="line-height: 1.6;">{{content}}</div><footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">{{company_name}} - {{unsubscribe_link}}</footer></body></html>',
true, '/templates/newsletter-simple.png'),

('Promotion', 'Template pour campagnes promotionnelles', 'marketing',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{subject}}</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"><div style="padding: 40px;"><h1 style="font-size: 32px; margin-bottom: 20px;">{{offer_title}}</h1><p style="font-size: 18px; margin-bottom: 30px;">{{offer_description}}</p><a href="{{cta_url}}" style="display: inline-block; background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">{{cta_text}}</a></div></body></html>',
true, '/templates/promotion.png'),

('Transactionnel', 'Template pour emails transactionnels', 'transactional',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{subject}}</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="border: 1px solid #ddd; border-radius: 8px; padding: 30px;"><h2 style="color: #333; margin-top: 0;">{{title}}</h2><div style="line-height: 1.6; color: #555;">{{content}}</div><div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">Cet email a été envoyé automatiquement, merci de ne pas répondre.</div></div></body></html>',
true, '/templates/transactional.png');
