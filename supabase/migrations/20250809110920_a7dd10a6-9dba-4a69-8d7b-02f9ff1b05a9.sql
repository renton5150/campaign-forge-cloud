-- Fix RLS for campaign_lists to allow saving selected lists and enable sending flow

-- Ensure table exists (no-op if already exists)
-- We don't create the table here, only adjust RLS policies safely.

-- Enable RLS (safe if already enabled)
ALTER TABLE public.campaign_lists ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on campaign_lists to avoid conflicts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT pol.polname AS policyname
    FROM pg_policy pol
    JOIN pg_class cls ON cls.oid = pol.polrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'public' AND cls.relname = 'campaign_lists'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.campaign_lists', r.policyname);
  END LOOP;
END$$;

-- Helpful unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_lists_campaign_list
  ON public.campaign_lists(campaign_id, list_id);

-- Policy: allow reading campaign list associations if user can access the campaign (same tenant, creator, or super_admin)
CREATE POLICY "campaign_lists_select"
ON public.campaign_lists
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
);

-- Policy: allow inserting campaign->list associations when user can manage the campaign and the list belongs to same tenant (or super_admin)
CREATE POLICY "campaign_lists_insert"
ON public.campaign_lists
FOR INSERT
WITH CHECK (
  -- User can manage the campaign
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
  AND
  -- And user can access the contact list (same tenant or super_admin)
  EXISTS (
    SELECT 1
    FROM public.contact_lists cl
    JOIN public.users u2 ON u2.id = auth.uid()
    WHERE cl.id = campaign_lists.list_id
      AND (
        u2.role = 'super_admin' OR
        (u2.tenant_id IS NOT DISTINCT FROM cl.tenant_id)
      )
  )
);

-- Policy: allow deleting associations when user can manage the campaign
CREATE POLICY "campaign_lists_delete"
ON public.campaign_lists
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
);

-- Optional: restrict updates (usually not needed). We'll mirror delete conditions.
CREATE POLICY "campaign_lists_update"
ON public.campaign_lists
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = campaign_lists.campaign_id
      AND (
        u.role = 'super_admin' OR
        c.created_by = u.id OR
        (u.tenant_id IS NOT DISTINCT FROM c.tenant_id)
      )
  )
);
