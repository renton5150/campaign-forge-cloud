
export type UserRole = 'super_admin' | 'tenant_admin' | 'tenant_growth' | 'tenant_sdr';
export type TenantStatus = 'active' | 'inactive' | 'suspended';
export type DomainVerificationStatus = 'pending' | 'verified' | 'failed';

export interface Tenant {
  id: string;
  company_name: string;
  domain: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  tenant_id: string;
  domain_name: string;
  verified: boolean;
  dkim_status: DomainVerificationStatus;
  created_at: string;
  updated_at: string;
}
