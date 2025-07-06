-- Add new columns to smtp_servers table for different provider types
ALTER TABLE public.smtp_servers 
ADD COLUMN api_key TEXT,
ADD COLUMN domain TEXT,
ADD COLUMN region TEXT,
ADD COLUMN encryption TEXT;