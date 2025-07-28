
-- Créer la table unsubscriptions qui manque
CREATE TABLE public.unsubscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  campaign_id UUID,
  unsubscribe_token TEXT NOT NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- Activer RLS sur la table
ALTER TABLE public.unsubscriptions ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs désabonnements
CREATE POLICY "Users can view their tenant unsubscriptions" 
ON public.unsubscriptions 
FOR SELECT 
USING (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

-- Politique pour que les utilisateurs puissent créer des désabonnements
CREATE POLICY "Users can create unsubscriptions for their tenant" 
ON public.unsubscriptions 
FOR INSERT 
WITH CHECK (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

-- Politique pour les super admins
CREATE POLICY "Super admin can manage all unsubscriptions" 
ON public.unsubscriptions 
FOR ALL 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin'));
