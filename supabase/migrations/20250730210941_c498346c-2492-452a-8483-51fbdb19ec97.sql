
-- Ajouter les colonnes de statut pour chaque type de validation DNS
ALTER TABLE public.sending_domains 
ADD COLUMN spf_status text DEFAULT 'pending' CHECK (spf_status IN ('pending', 'verified', 'failed')),
ADD COLUMN dmarc_status text DEFAULT 'pending' CHECK (dmarc_status IN ('pending', 'verified', 'failed')),
ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed'));

-- Mettre à jour les domaines existants pour avoir des statuts cohérents
UPDATE public.sending_domains 
SET 
  spf_status = CASE 
    WHEN status = 'verified' THEN 'verified'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'pending'
  END,
  dmarc_status = CASE 
    WHEN status = 'verified' THEN 'verified'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'pending'
  END,
  verification_status = CASE 
    WHEN status = 'verified' THEN 'verified'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'pending'
  END;
