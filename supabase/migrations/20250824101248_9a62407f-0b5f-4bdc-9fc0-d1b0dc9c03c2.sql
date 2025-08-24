-- Fix orphan campaign by assigning to the tenant with SMTP servers
UPDATE public.campaigns 
SET tenant_id = '5a4c9c60-98e9-41c2-a04a-59f95e13da61'
WHERE id = '9285521c-41f0-4416-ac44-9431285adf61';