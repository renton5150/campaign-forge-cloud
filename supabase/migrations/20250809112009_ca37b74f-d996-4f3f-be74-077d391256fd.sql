-- Create campaign_blacklist_lists to persist selected blacklist lists per campaign
CREATE TABLE IF NOT EXISTS public.campaign_blacklist_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  blacklist_list_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_blacklist_lists ENABLE ROW LEVEL SECURITY;

-- Unique association per campaign/list
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_blacklist_lists_campaign_list
  ON public.campaign_blacklist_lists(campaign_id, blacklist_list_id);

-- Drop existing policies to avoid conflicts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT pol.polname AS policyname
    FROM pg_policy pol
    JOIN pg_class cls ON cls.oid = pol.polrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'public' AND cls.relname = 'campaign_blacklist_lists'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.campaign_blacklist_lists', r.policyname);
  END LOOP;
END$$;

-- SELECT policy: user can read associations for campaigns they can access
CREATE POLICY campaign_blacklist_lists_select
ON public.campaign_blacklist_lists
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_blacklist_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
);

-- INSERT policy: user can manage campaign and access blacklist list (same tenant or super_admin)
CREATE POLICY campaign_blacklist_lists_insert
ON public.campaign_blacklist_lists
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_blacklist_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
  AND EXISTS (
    SELECT 1 FROM public.blacklist_lists bl
    JOIN public.users u2 ON u2.id = auth.uid()
    WHERE bl.id = campaign_blacklist_lists.blacklist_list_id
      AND (
        u2.role = 'super_admin' OR
        (u2.tenant_id IS NOT DISTINCT FROM bl.tenant_id)
      )
  )
);

-- UPDATE policy (mirror insert conditions)
CREATE POLICY campaign_blacklist_lists_update
ON public.campaign_blacklist_lists
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_blacklist_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_blacklist_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
);

-- DELETE policy: user can manage campaign
CREATE POLICY campaign_blacklist_lists_delete
ON public.campaign_blacklist_lists
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_blacklist_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
);
