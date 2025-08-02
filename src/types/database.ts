
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
  dkim_private_key: string | null;
  dkim_public_key: string | null;
  dkim_selector: string | null;
  created_at: string;
  updated_at: string;
}

// Type pour la réponse de la fonction Supabase create_domain_with_dkim
export interface CreateDomainResponse {
  success: boolean;
  domain_id?: string;
  selector?: string;
  message?: string;
  error?: string;
  details?: string;
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

// Types pour le système de campagnes email
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'archived';
export type ContactStatus = 'active' | 'unsubscribed' | 'bounced';
export type SendStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
export type BounceType = 'hard' | 'soft';
export type EventType = 'open' | 'click' | 'unsubscribe' | 'complaint';
export type ABWinnerCriteria = 'open_rate' | 'click_rate';

export interface ContactList {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  total_contacts: number;
  tags: string[];
  is_archived: boolean;
  last_activity_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  custom_fields: Record<string, any>;
  status: ContactStatus;
  validation_status: 'valid' | 'invalid' | 'unknown' | 'risky';
  engagement_score: number;
  source: 'manual' | 'import' | 'api' | 'form';
  language: string;
  notes: string | null;
  last_activity_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContactListMembership {
  id: string;
  contact_id: string;
  list_id: string;
  added_at: string;
  added_by: string;
}

export interface EmailTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  category: string;
  html_content: string;
  preview_text: string | null;
  is_system_template: boolean;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  mission_id: string | null;
  tags: string[];
  usage_count: number;
  is_favorite: boolean;
  last_used_at: string | null;
}

export interface Mission {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  is_system_category: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  html_content: string;
  status: CampaignStatus;
  template_id: string | null;
  scheduled_at: string | null;
  timezone: string;
  is_ab_test: boolean;
  ab_subject_b: string | null;
  ab_split_percentage: number;
  ab_winner_criteria: ABWinnerCriteria;
  ab_test_duration_hours: number;
  tags: string[];
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export interface CampaignList {
  id: string;
  campaign_id: string;
  list_id: string;
  added_at: string;
}

export interface CampaignSend {
  id: string;
  campaign_id: string;
  contact_id: string;
  email: string;
  status: SendStatus;
  bounce_type: BounceType | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  ab_variant: 'A' | 'B';
}

export interface CampaignEvent {
  id: string;
  campaign_id: string;
  contact_id: string;
  send_id: string;
  event_type: EventType;
  event_data: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CampaignAttachment {
  id: string;
  campaign_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

export interface CampaignStats {
  total_sent: number;
  delivered: number;
  bounced: number;
  hard_bounces: number;
  soft_bounces: number;
  unique_opens: number;
  total_opens: number;
  unique_clicks: number;
  total_clicks: number;
  unsubscribes: number;
  complaints: number;
}

export interface Blacklist {
  id: string;
  tenant_id: string | null;
  type: 'email' | 'domain';
  value: string;
  reason?: string;
  category: 'bounce' | 'complaint' | 'manual' | 'competitor';
  blacklist_list_id?: string;
  created_by: string;
  created_at: string;
}

export interface BlacklistList {
  id: string;
  tenant_id: string | null;
  name: string;
  description?: string;
  type: 'email' | 'domain' | 'mixed';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Types pour le système d'email queue - SIMPLIFIÉS POUR CORRIGER LES ERREURS
export type EmailQueueStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'bounced';

export interface EmailQueue {
  id: string;
  campaign_id: string;
  contact_email: string;
  contact_name: string | null;
  subject: string;
  html_content: string;
  status: EmailQueueStatus;
  message_id: string | null;
  retry_count: number;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmtpRateLimits {
  id: string;
  smtp_server_id: string;
  emails_sent_hour: number;
  emails_sent_day: number;
  emails_sent_minute: number;
  last_reset_hour: string;
  last_reset_day: string;
  last_reset_minute: string;
  created_at: string;
  updated_at: string;
}

export interface EmailToSend {
  queue_id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  content_html: string;
  smtp_server_id: string;
  message_id: string;
}

// Types pour les résultats de fonctions RPC - SIMPLIFIÉS
export interface QueueCampaignResult {
  success: boolean;
  queued_emails: number;
  duplicates_skipped: number;
  message: string;
}

export interface CleanupResult {
  cleaned_count: number;
}
