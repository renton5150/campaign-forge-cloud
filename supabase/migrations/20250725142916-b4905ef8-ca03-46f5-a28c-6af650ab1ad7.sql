
-- Créer la table des missions
CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table des catégories de templates personnalisables
CREATE TABLE public.template_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  is_system_category BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes à la table email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES public.missions(id),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- Insérer les catégories système par défaut
INSERT INTO public.template_categories (name, description, is_system_category, tenant_id) VALUES
('Marketing', 'Templates pour campagnes marketing', true, NULL),
('Newsletter', 'Templates pour newsletters', true, NULL),
('Transactionnel', 'Templates pour emails transactionnels', true, NULL),
('Événement', 'Templates pour événements', true, NULL),
('Personnalisé', 'Templates personnalisés', true, NULL);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour missions
CREATE POLICY "Users can manage their tenant missions" ON public.missions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  ) OR 
  tenant_id = (
    SELECT u.tenant_id FROM public.users u 
    WHERE u.id = auth.uid()
  )
);

-- Politiques RLS pour template_categories
CREATE POLICY "Users can view categories" ON public.template_categories
FOR SELECT USING (
  is_system_category = true OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  ) OR 
  tenant_id = (
    SELECT u.tenant_id FROM public.users u 
    WHERE u.id = auth.uid()
  )
);

CREATE POLICY "Users can manage their tenant categories" ON public.template_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  ) OR 
  tenant_id = (
    SELECT u.tenant_id FROM public.users u 
    WHERE u.id = auth.uid()
  )
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON public.template_categories
FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
