-- Create SMTP servers table
CREATE TABLE public.smtp_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('smtp', 'sendgrid', 'mailgun')),
  host TEXT,
  port INTEGER,
  username TEXT,
  password TEXT,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.smtp_servers ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant access
CREATE POLICY "Users can manage their tenant SMTP servers" 
ON public.smtp_servers 
FOR ALL 
USING (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_smtp_servers_updated_at
BEFORE UPDATE ON public.smtp_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();