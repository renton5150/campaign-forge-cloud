-- Créer les tables manquantes pour le module contacts & listes

-- Table pour l'historique des activités des contacts
CREATE TABLE public.contact_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'email_open', 'email_click', 'email_bounce', 'unsubscribe', 'import', 'manual_add'
  campaign_id UUID NULL REFERENCES public.campaigns(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les blacklists par tenant
CREATE TABLE public.blacklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'email', 'domain'
  value TEXT NOT NULL, -- email ou domaine
  reason TEXT NULL, -- 'hard_bounce', 'complaint', 'manual', 'unsubscribe'
  category TEXT DEFAULT 'manual', -- 'bounce', 'complaint', 'manual', 'competitor'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, type, value)
);

-- Table pour les jobs d'import
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  mapping JSONB NOT NULL DEFAULT '{}', -- mapping des colonnes
  results JSONB DEFAULT '{}', -- résultats de l'import (succès, erreurs, doublons)
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  target_list_id UUID NULL REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Table pour les segments dynamiques
CREATE TABLE public.segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  rules JSONB NOT NULL DEFAULT '{}', -- règles de segmentation
  contact_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true, -- true = mise à jour auto, false = statique
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les contacts dans les segments
CREATE TABLE public.segment_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(segment_id, contact_id)
);

-- Améliorer la table contacts existante avec des colonnes manquantes
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'unknown'; -- 'valid', 'invalid', 'unknown', 'risky'
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0; -- Score de 0 à 100
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'; -- 'manual', 'import', 'api', 'form'
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr'; -- Langue détectée
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes TEXT NULL; -- Notes personnalisées
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE NULL;

-- Améliorer la table contact_lists avec des métadonnées
ALTER TABLE public.contact_lists ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.contact_lists ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.contact_lists ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE NULL;

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_memberships ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour contact_activities
CREATE POLICY "Users can view their tenant contact activities" ON public.contact_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contacts c 
      WHERE c.id = contact_activities.contact_id 
      AND c.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

CREATE POLICY "Users can create contact activities for their tenant" ON public.contact_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c 
      WHERE c.id = contact_activities.contact_id 
      AND c.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

-- Politiques RLS pour blacklists
CREATE POLICY "Users can manage their tenant blacklists" ON public.blacklists
  FOR ALL USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Politiques RLS pour import_jobs
CREATE POLICY "Users can manage their tenant import jobs" ON public.import_jobs
  FOR ALL USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Politiques RLS pour segments
CREATE POLICY "Users can manage their tenant segments" ON public.segments
  FOR ALL USING (
    tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Politiques RLS pour segment_memberships
CREATE POLICY "Users can view their tenant segment memberships" ON public.segment_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.segments s 
      WHERE s.id = segment_memberships.segment_id 
      AND s.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their tenant segment memberships" ON public.segment_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.segments s 
      WHERE s.id = segment_memberships.segment_id 
      AND s.tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    )
  );

-- Index pour les performances
CREATE INDEX idx_contact_activities_contact_id ON public.contact_activities(contact_id);
CREATE INDEX idx_contact_activities_timestamp ON public.contact_activities(timestamp DESC);
CREATE INDEX idx_blacklists_tenant_type_value ON public.blacklists(tenant_id, type, value);
CREATE INDEX idx_import_jobs_tenant_status ON public.import_jobs(tenant_id, status);
CREATE INDEX idx_segments_tenant_id ON public.segments(tenant_id);
CREATE INDEX idx_segment_memberships_segment_id ON public.segment_memberships(segment_id);
CREATE INDEX idx_contacts_validation_status ON public.contacts(validation_status);
CREATE INDEX idx_contacts_engagement_score ON public.contacts(engagement_score DESC);

-- Triggers pour updated_at
CREATE TRIGGER update_segments_updated_at 
  BEFORE UPDATE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour calculer le score d'engagement
CREATE OR REPLACE FUNCTION calculate_engagement_score(contact_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  open_count INTEGER;
  click_count INTEGER;
  recent_activity_count INTEGER;
BEGIN
  -- Compter les ouvertures (5 points par ouverture, max 30)
  SELECT COUNT(*) INTO open_count 
  FROM contact_activities 
  WHERE contact_id = contact_id_param AND activity_type = 'email_open';
  score := score + LEAST(open_count * 5, 30);
  
  -- Compter les clics (10 points par clic, max 40)
  SELECT COUNT(*) INTO click_count 
  FROM contact_activities 
  WHERE contact_id = contact_id_param AND activity_type = 'email_click';
  score := score + LEAST(click_count * 10, 40);
  
  -- Activité récente (30 jours) bonus 20 points
  SELECT COUNT(*) INTO recent_activity_count 
  FROM contact_activities 
  WHERE contact_id = contact_id_param 
  AND timestamp > (NOW() - INTERVAL '30 days');
  
  IF recent_activity_count > 0 THEN
    score := score + 20;
  END IF;
  
  -- Pénalité pour bounce (-50 points)
  IF EXISTS (
    SELECT 1 FROM contact_activities 
    WHERE contact_id = contact_id_param AND activity_type = 'email_bounce'
  ) THEN
    score := score - 50;
  END IF;
  
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le total_contacts des listes
CREATE OR REPLACE FUNCTION update_list_contact_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le compteur de la liste
  UPDATE contact_lists 
  SET total_contacts = (
    SELECT COUNT(*) 
    FROM contact_list_memberships clm
    JOIN contacts c ON c.id = clm.contact_id
    WHERE clm.list_id = COALESCE(NEW.list_id, OLD.list_id)
    AND c.status = 'active'
  ),
  last_activity_at = now()
  WHERE id = COALESCE(NEW.list_id, OLD.list_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement les compteurs
CREATE TRIGGER update_list_count_on_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON contact_list_memberships
  FOR EACH ROW EXECUTE FUNCTION update_list_contact_count();

-- Quelques données de test pour les blacklists communes
INSERT INTO public.blacklists (tenant_id, type, value, reason, category, created_by) 
VALUES 
  ((SELECT id FROM tenants LIMIT 1), 'domain', 'competitors.com', 'Concurrent direct', 'competitor', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  ((SELECT id FROM tenants LIMIT 1), 'domain', 'spam.com', 'Domaine spam connu', 'manual', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  ((SELECT id FROM tenants LIMIT 1), 'email', 'noreply@test.com', 'Email de test', 'manual', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1))
ON CONFLICT (tenant_id, type, value) DO NOTHING;