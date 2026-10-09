export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campaign_leads: {
        Row: {
          added_at: string
          campaign_id: string
          lead_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          added_at?: string
          campaign_id: string
          lead_id: string
          status?: string
          workspace_id: string
        }
        Update: {
          added_at?: string
          campaign_id?: string
          lead_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          auto_send: boolean
          created_at: string
          created_by: string
          email_account_id: string | null
          goal: string | null
          id: string
          name: string
          status: string
          steps: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_send?: boolean
          created_at?: string
          created_by?: string
          email_account_id?: string | null
          goal?: string | null
          id?: string
          name: string
          status?: string
          steps?: Json
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          auto_send?: boolean
          created_at?: string
          created_by?: string
          email_account_id?: string | null
          goal?: string | null
          id?: string
          name?: string
          status?: string
          steps?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token_enc: string | null
          access_token_expires_at: string | null
          connected_by: string
          created_at: string
          daily_limit: number
          display_name: string | null
          email: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          provider: string
          refresh_token_enc: string | null
          status: string
          sync_cursor: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_token_enc?: string | null
          access_token_expires_at?: string | null
          connected_by: string
          created_at?: string
          daily_limit?: number
          display_name?: string | null
          email: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider: string
          refresh_token_enc?: string | null
          status?: string
          sync_cursor?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_token_enc?: string | null
          access_token_expires_at?: string | null
          connected_by?: string
          created_at?: string
          daily_limit?: number
          display_name?: string | null
          email?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          refresh_token_enc?: string | null
          status?: string
          sync_cursor?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          created_at: string
          email_account_id: string
          id: string
          last_message_ref: string | null
          lead_id: string
          provider_thread_id: string
          subject: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email_account_id: string
          id?: string
          last_message_ref?: string | null
          lead_id: string
          provider_thread_id: string
          subject?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email_account_id?: string
          id?: string
          last_message_ref?: string | null
          lead_id?: string
          provider_thread_id?: string
          subject?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          body: string
          campaign_id: string | null
          channel: string
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          due_at: string
          email_account_id: string | null
          id: string
          last_error: string | null
          lead_id: string
          status: string
          step: number
          subject: string | null
          workspace_id: string
        }
        Insert: {
          body?: string
          campaign_id?: string | null
          channel?: string
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_at: string
          email_account_id?: string | null
          id?: string
          last_error?: string | null
          lead_id: string
          status?: string
          step?: number
          subject?: string | null
          workspace_id: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          channel?: string
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_at?: string
          email_account_id?: string | null
          id?: string
          last_error?: string | null
          lead_id?: string
          status?: string
          step?: number
          subject?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          direction: string
          email_account_id: string | null
          external_id: string | null
          id: string
          lead_id: string
          subject: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          direction: string
          email_account_id?: string | null
          external_id?: string | null
          id?: string
          lead_id: string
          subject?: string | null
          user_id?: string
          workspace_id?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          direction?: string
          email_account_id?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string
          subject?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_replies: {
        Row: {
          analysis: Json
          created_at: string
          id: string
          lead_id: string | null
          reply: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          analysis: Json
          created_at?: string
          id?: string
          lead_id?: string | null
          reply: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          analysis?: Json
          created_at?: string
          id?: string
          lead_id?: string | null
          reply?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_replies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_replies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          industry: string | null
          interactions: string | null
          last_contacted_at: string | null
          location: string | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          place_id: string | null
          qualification: Json | null
          research: Json | null
          role: string | null
          score: number | null
          source: string
          stage: string
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          company: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          interactions?: string | null
          last_contacted_at?: string | null
          location?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          qualification?: Json | null
          research?: Json | null
          role?: string | null
          score?: number | null
          source?: string
          stage?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          company?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          interactions?: string | null
          last_contacted_at?: string | null
          location?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          qualification?: Json | null
          research?: Json | null
          role?: string | null
          score?: number | null
          source?: string
          stage?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_workspace_id: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          active_workspace_id?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          active_workspace_id?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_workspace_id_fkey"
            columns: ["active_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_outreach: {
        Row: {
          content: Json
          created_at: string
          id: string
          kind: string
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          kind?: string
          title: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_outreach_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          email: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          booking_url: string | null
          created_at: string
          created_by: string
          id: string
          industry: string | null
          name: string
          offer: string | null
          onboarded_at: string | null
          plan: string
          target_customer: string | null
          tone: string
          updated_at: string
          value_proposition: string | null
          website: string | null
        }
        Insert: {
          booking_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string | null
          name: string
          offer?: string | null
          onboarded_at?: string | null
          plan?: string
          target_customer?: string | null
          tone?: string
          updated_at?: string
          value_proposition?: string | null
          website?: string | null
        }
        Update: {
          booking_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string | null
          name?: string
          offer?: string | null
          onboarded_at?: string | null
          plan?: string
          target_customer?: string | null
          tone?: string
          updated_at?: string
          value_proposition?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invite: { Args: { _token: string }; Returns: Json }
      consume_ai_credit: { Args: { _kind: string }; Returns: Json }
      current_workspace_id: { Args: never; Returns: string }
      claim_due_follow_ups: {
        Args: { _limit: number }
        Returns: Database["public"]["Tables"]["follow_ups"]["Row"][]
      }
      is_workspace_member: { Args: { _ws: string }; Returns: boolean }
      resume_lead_sequence: { Args: { _lead: string }; Returns: number }
      workspace_member_list: {
        Args: { _ws: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      workspace_role: { Args: { _ws: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
