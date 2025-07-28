export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      blacklist_item_lists: {
        Row: {
          added_at: string
          added_by: string
          blacklist_id: string
          blacklist_list_id: string
          id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          blacklist_id: string
          blacklist_list_id: string
          id?: string
        }
        Update: {
          added_at?: string
          added_by?: string
          blacklist_id?: string
          blacklist_list_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blacklist_item_lists_blacklist_id_fkey"
            columns: ["blacklist_id"]
            isOneToOne: false
            referencedRelation: "blacklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blacklist_item_lists_blacklist_list_id_fkey"
            columns: ["blacklist_list_id"]
            isOneToOne: false
            referencedRelation: "blacklist_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklist_lists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      blacklists: {
        Row: {
          blacklist_list_id: string | null
          category: string | null
          created_at: string
          created_by: string
          id: string
          reason: string | null
          tenant_id: string | null
          type: string
          value: string
        }
        Insert: {
          blacklist_list_id?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          reason?: string | null
          tenant_id?: string | null
          type: string
          value: string
        }
        Update: {
          blacklist_list_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          reason?: string | null
          tenant_id?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      campaign_attachments: {
        Row: {
          campaign_id: string
          created_at: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          storage_path: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          storage_path: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_attachments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          send_id: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          send_id: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          send_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "campaign_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_lists: {
        Row: {
          added_at: string
          campaign_id: string
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          campaign_id: string
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string
          campaign_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_lists_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          ab_variant: string | null
          bounce_type: string | null
          campaign_id: string
          contact_id: string
          delivered_at: string | null
          email: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          ab_variant?: string | null
          bounce_type?: string | null
          campaign_id: string
          contact_id: string
          delivered_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          ab_variant?: string | null
          bounce_type?: string | null
          campaign_id?: string
          contact_id?: string
          delivered_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ab_split_percentage: number | null
          ab_subject_b: string | null
          ab_test_duration_hours: number | null
          ab_winner_criteria: string | null
          created_at: string
          created_by: string
          from_email: string
          from_name: string
          html_content: string
          id: string
          is_ab_test: boolean | null
          name: string
          notes: string | null
          preview_text: string | null
          reply_to: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          tags: string[] | null
          template_id: string | null
          tenant_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          ab_split_percentage?: number | null
          ab_subject_b?: string | null
          ab_test_duration_hours?: number | null
          ab_winner_criteria?: string | null
          created_at?: string
          created_by: string
          from_email: string
          from_name: string
          html_content: string
          id?: string
          is_ab_test?: boolean | null
          name: string
          notes?: string | null
          preview_text?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          tags?: string[] | null
          template_id?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          ab_split_percentage?: number | null
          ab_subject_b?: string | null
          ab_test_duration_hours?: number | null
          ab_winner_criteria?: string | null
          created_at?: string
          created_by?: string
          from_email?: string
          from_name?: string
          html_content?: string
          id?: string
          is_ab_test?: boolean | null
          name?: string
          notes?: string | null
          preview_text?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          tags?: string[] | null
          template_id?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activities: {
        Row: {
          activity_type: string
          campaign_id: string | null
          contact_id: string
          created_at: string
          details: Json | null
          id: string
          timestamp: string
        }
        Insert: {
          activity_type: string
          campaign_id?: string | null
          contact_id: string
          created_at?: string
          details?: Json | null
          id?: string
          timestamp?: string
        }
        Update: {
          activity_type?: string
          campaign_id?: string | null
          contact_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_list_memberships: {
        Row: {
          added_at: string
          added_by: string
          contact_id: string
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          contact_id: string
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          contact_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_list_memberships_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_memberships_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean | null
          last_activity_at: string | null
          name: string
          tags: string[] | null
          tenant_id: string | null
          total_contacts: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          last_activity_at?: string | null
          name: string
          tags?: string[] | null
          tenant_id?: string | null
          total_contacts?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          last_activity_at?: string | null
          name?: string
          tags?: string[] | null
          tenant_id?: string | null
          total_contacts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          email: string
          engagement_score: number | null
          first_name: string | null
          id: string
          language: string | null
          last_activity_at: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string | null
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          email: string
          engagement_score?: number | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          email?: string
          engagement_score?: number | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_role: boolean
          label: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          label: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          label?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          dkim_private_key: string | null
          dkim_public_key: string | null
          dkim_selector: string | null
          dkim_status: Database["public"]["Enums"]["domain_verification_status"]
          domain_name: string
          id: string
          tenant_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          dkim_private_key?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dkim_status?: Database["public"]["Enums"]["domain_verification_status"]
          domain_name: string
          id?: string
          tenant_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          dkim_private_key?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dkim_status?: Database["public"]["Enums"]["domain_verification_status"]
          domain_name?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          email_queue_id: string | null
          id: string
          message: string | null
          status: string
          timestamp: string | null
        }
        Insert: {
          email_queue_id?: string | null
          id?: string
          message?: string | null
          status: string
          timestamp?: string | null
        }
        Update: {
          email_queue_id?: string | null
          id?: string
          message?: string | null
          status?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_email_queue_id_fkey"
            columns: ["email_queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          campaign_id: string
          contact_email: string
          contact_name: string | null
          created_at: string | null
          error_message: string | null
          html_content: string
          id: string
          message_id: string | null
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          campaign_id: string
          contact_email: string
          contact_name?: string | null
          created_at?: string | null
          error_message?: string | null
          html_content: string
          id?: string
          message_id?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          campaign_id?: string
          contact_email?: string
          contact_name?: string | null
          created_at?: string | null
          error_message?: string | null
          html_content?: string
          id?: string
          message_id?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_favorite: boolean | null
          is_system_template: boolean | null
          last_used_at: string | null
          mission_id: string | null
          name: string
          preview_text: string | null
          tags: string[] | null
          tenant_id: string | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_favorite?: boolean | null
          is_system_template?: boolean | null
          last_used_at?: string | null
          mission_id?: string | null
          name: string
          preview_text?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_favorite?: boolean | null
          is_system_template?: boolean | null
          last_used_at?: string | null
          mission_id?: string | null
          name?: string
          preview_text?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          duplicate_rows: number | null
          error_rows: number | null
          file_size: number
          filename: string
          id: string
          mapping: Json
          processed_rows: number | null
          results: Json | null
          status: string
          successful_rows: number | null
          target_list_id: string | null
          tenant_id: string
          total_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          duplicate_rows?: number | null
          error_rows?: number | null
          file_size: number
          filename: string
          id?: string
          mapping?: Json
          processed_rows?: number | null
          results?: Json | null
          status?: string
          successful_rows?: number | null
          target_list_id?: string | null
          tenant_id: string
          total_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          duplicate_rows?: number | null
          error_rows?: number | null
          file_size?: number
          filename?: string
          id?: string
          mapping?: Json
          processed_rows?: number | null
          results?: Json | null
          status?: string
          successful_rows?: number | null
          target_list_id?: string | null
          tenant_id?: string
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_target_list_id_fkey"
            columns: ["target_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      permission_audit: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
          permission_id: string | null
          role_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          label: string
          module_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          label: string
          module_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_memberships: {
        Row: {
          added_at: string
          contact_id: string
          id: string
          segment_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          id?: string
          segment_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_memberships_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          contact_count: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_dynamic: boolean | null
          last_updated: string | null
          name: string
          rules: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_count?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          last_updated?: string | null
          name: string
          rules?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_count?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_dynamic?: boolean | null
          last_updated?: string | null
          name?: string
          rules?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sending_domains: {
        Row: {
          created_at: string | null
          dkim_private_key: string | null
          dkim_public_key: string | null
          dkim_selector: string | null
          dkim_status: string | null
          dmarc_record: string | null
          dns_verified_at: string | null
          domain_name: string
          id: string
          last_verification_attempt: string | null
          spf_record: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          verification_errors: Json | null
          verification_token: string | null
        }
        Insert: {
          created_at?: string | null
          dkim_private_key?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dkim_status?: string | null
          dmarc_record?: string | null
          dns_verified_at?: string | null
          domain_name: string
          id?: string
          last_verification_attempt?: string | null
          spf_record?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          verification_errors?: Json | null
          verification_token?: string | null
        }
        Update: {
          created_at?: string | null
          dkim_private_key?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dkim_status?: string | null
          dmarc_record?: string | null
          dns_verified_at?: string | null
          domain_name?: string
          id?: string
          last_verification_attempt?: string | null
          spf_record?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          verification_errors?: Json | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sending_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_servers: {
        Row: {
          api_key: string | null
          created_at: string
          domain: string | null
          encryption: string | null
          from_email: string
          from_name: string
          host: string | null
          id: string
          is_active: boolean
          name: string
          password: string | null
          port: number | null
          region: string | null
          sending_domain_id: string | null
          tenant_id: string
          type: string
          updated_at: string
          username: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          domain?: string | null
          encryption?: string | null
          from_email: string
          from_name: string
          host?: string | null
          id?: string
          is_active?: boolean
          name: string
          password?: string | null
          port?: number | null
          region?: string | null
          sending_domain_id?: string | null
          tenant_id: string
          type: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          domain?: string | null
          encryption?: string | null
          from_email?: string
          from_name?: string
          host?: string | null
          id?: string
          is_active?: boolean
          name?: string
          password?: string | null
          port?: number | null
          region?: string | null
          sending_domain_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_servers_sending_domain_id_fkey"
            columns: ["sending_domain_id"]
            isOneToOne: false
            referencedRelation: "sending_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system_category: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_category?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_category?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          company_name: string
          created_at: string
          domain: string
          id: string
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          domain: string
          id?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          domain?: string
          id?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      unsubscribe_tokens: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          tenant_id: string
          token: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          tenant_id: string
          token: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "unsubscribe_tokens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unsubscribe_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      unsubscriptions: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string
          id: string
          ip_address: unknown | null
          reason: string | null
          tenant_id: string
          unsubscribe_token: string
          user_agent: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          tenant_id: string
          unsubscribe_token: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          tenant_id?: string
          unsubscribe_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_engagement_score: {
        Args: { contact_id_param: string }
        Returns: number
      }
      cleanup_expired_unsubscribe_tokens: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_domain_with_dkim: {
        Args: { p_domain_name: string; p_tenant_id: string }
        Returns: Json
      }
      create_sending_domain: {
        Args: { p_domain_name: string; p_tenant_id: string }
        Returns: Json
      }
      create_unsubscribe_token: {
        Args: { p_email: string; p_tenant_id: string; p_campaign_id?: string }
        Returns: string
      }
      debug_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_dkim_keypair: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_unsubscribe_token: {
        Args: { p_email: string; p_tenant_id: string; p_campaign_id?: string }
        Returns: string
      }
      get_campaign_stats: {
        Args: { campaign_id_param: string }
        Returns: Json
      }
      process_unsubscription: {
        Args: {
          p_token: string
          p_email: string
          p_tenant_id: string
          p_campaign_id?: string
          p_reason?: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: Json
      }
      user_has_permission: {
        Args: { _user_id: string; _module_name: string; _action: string }
        Returns: boolean
      }
    }
    Enums: {
      domain_verification_status: "pending" | "verified" | "failed"
      tenant_status: "active" | "inactive" | "suspended"
      user_role: "super_admin" | "tenant_admin" | "tenant_growth" | "tenant_sdr"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      domain_verification_status: ["pending", "verified", "failed"],
      tenant_status: ["active", "inactive", "suspended"],
      user_role: ["super_admin", "tenant_admin", "tenant_growth", "tenant_sdr"],
    },
  },
} as const
