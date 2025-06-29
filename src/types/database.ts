
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

// Nouveaux types pour le système de permissions
export interface Module {
  id: string;
  name: string;
  label: string;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  module_id: string;
  action: string;
  label: string;
  description: string | null;
  created_at: string;
}

export interface CustomRole {
  id: string;
  tenant_id: string | null;
  name: string;
  label: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by: string | null;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface PermissionAudit {
  id: string;
  user_id: string;
  role_id: string | null;
  permission_id: string | null;
  action: string;
  details: any;
  created_at: string;
  created_by: string | null;
}
