
-- Create enum for user roles with hierarchy
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'tenant_growth', 'tenant_sdr');

-- Create enum for tenant status
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'suspended');

-- Create enum for domain verification status
CREATE TYPE domain_verification_status AS ENUM ('pending', 'verified', 'failed');

-- 1. TENANTS table - Base clients
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    status tenant_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. USERS table - All users with tenant isolation
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'tenant_sdr',
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Super admin can have null tenant_id, others must have one
    CONSTRAINT users_tenant_constraint CHECK (
        (role = 'super_admin' AND tenant_id IS NULL) OR 
        (role != 'super_admin' AND tenant_id IS NOT NULL)
    )
);

-- 3. DOMAINS table - Email sending domains per tenant
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    dkim_status domain_verification_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Unique domain per tenant
    UNIQUE(tenant_id, domain_name)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- TENANTS RLS Policies
-- Super admin can see all tenants
CREATE POLICY "Super admin can view all tenants" ON public.tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Super admin can manage all tenants
CREATE POLICY "Super admin can manage tenants" ON public.tenants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- USERS RLS Policies
-- Super admin can see all users
CREATE POLICY "Super admin can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Users can only see users from their own tenant
CREATE POLICY "Users can view same tenant users" ON public.users
    FOR SELECT USING (
        tenant_id = (
            SELECT u.tenant_id FROM public.users u 
            WHERE u.id = auth.uid()
        )
    );

-- Super admin can manage all users
CREATE POLICY "Super admin can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'super_admin'
        )
    );

-- Tenant admins can manage users in their tenant
CREATE POLICY "Tenant admin can manage tenant users" ON public.users
    FOR ALL USING (
        tenant_id = (
            SELECT u.tenant_id FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'tenant_admin'
        )
    );

-- DOMAINS RLS Policies
-- Super admin can see all domains
CREATE POLICY "Super admin can view all domains" ON public.domains
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Users can only see domains from their tenant
CREATE POLICY "Users can view tenant domains" ON public.domains
    FOR SELECT USING (
        tenant_id = (
            SELECT u.tenant_id FROM public.users u 
            WHERE u.id = auth.uid()
        )
    );

-- Super admin can manage all domains
CREATE POLICY "Super admin can manage all domains" ON public.domains
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Tenant admins and growth can manage domains in their tenant
CREATE POLICY "Tenant users can manage tenant domains" ON public.domains
    FOR ALL USING (
        tenant_id = (
            SELECT u.tenant_id FROM public.users u 
            WHERE u.id = auth.uid() AND u.role IN ('tenant_admin', 'tenant_growth')
        )
    );

-- Create trigger to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON public.domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert super admin user (you - Alexandre from Seventic)
-- This will be executed after you create your auth user
-- You'll need to replace 'your-auth-uuid' with your actual auth.users id after signup
