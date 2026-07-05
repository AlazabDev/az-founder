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
      ai_agents: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          display_name: string | null
          enabled: boolean
          endpoint_id: string | null
          id: string
          kind: Database["public"]["Enums"]["agent_kind"]
          model: string | null
          name: string
          system_prompt: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          enabled?: boolean
          endpoint_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agent_kind"]
          model?: string | null
          name: string
          system_prompt?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          enabled?: boolean
          endpoint_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agent_kind"]
          model?: string | null
          name?: string
          system_prompt?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "ai_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          endpoint_id: string | null
          id: string
          system_prompt: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint_id?: string | null
          id?: string
          system_prompt?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string | null
          id?: string
          system_prompt?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "ai_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_endpoints: {
        Row: {
          api_key: string | null
          api_version: string | null
          base_url: string | null
          created_at: string
          created_by: string | null
          deployment_name: string | null
          enabled: boolean
          extra_headers: Json
          id: string
          is_default: boolean
          last_checked_at: string | null
          last_latency_ms: number | null
          last_status: string | null
          model: string
          name: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string
          use_apim: boolean
        }
        Insert: {
          api_key?: string | null
          api_version?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          deployment_name?: string | null
          enabled?: boolean
          extra_headers?: Json
          id?: string
          is_default?: boolean
          last_checked_at?: string | null
          last_latency_ms?: number | null
          last_status?: string | null
          model: string
          name: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          use_apim?: boolean
        }
        Update: {
          api_key?: string | null
          api_version?: string | null
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          deployment_name?: string | null
          enabled?: boolean
          extra_headers?: Json
          id?: string
          is_default?: boolean
          last_checked_at?: string | null
          last_latency_ms?: number | null
          last_status?: string | null
          model?: string
          name?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          use_apim?: boolean
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          parts: Json | null
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parts?: Json | null
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parts?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          conversation_id: string | null
          created_at: string
          endpoint_id: string | null
          error: string | null
          flagged: boolean
          id: string
          latency_ms: number | null
          model: string | null
          prompt_tokens: number
          request_id: string | null
          status: Database["public"]["Enums"]["usage_status"]
          total_cost_usd: number
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string
          endpoint_id?: string | null
          error?: string | null
          flagged?: boolean
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number
          request_id?: string | null
          status?: Database["public"]["Enums"]["usage_status"]
          total_cost_usd?: number
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string
          endpoint_id?: string | null
          error?: string | null
          flagged?: boolean
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number
          request_id?: string | null
          status?: Database["public"]["Enums"]["usage_status"]
          total_cost_usd?: number
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "ai_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      apim_policies: {
        Row: {
          applies_to_endpoint_id: string | null
          config: Json
          created_at: string
          enabled: boolean
          id: string
          name: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          updated_at: string
        }
        Insert: {
          applies_to_endpoint_id?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          policy_type: Database["public"]["Enums"]["policy_type"]
          updated_at?: string
        }
        Update: {
          applies_to_endpoint_id?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          policy_type?: Database["public"]["Enums"]["policy_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apim_policies_applies_to_endpoint_id_fkey"
            columns: ["applies_to_endpoint_id"]
            isOneToOne: false
            referencedRelation: "ai_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      model_pricing: {
        Row: {
          currency: string
          id: string
          input_per_1k: number
          model: string
          output_per_1k: number
          updated_at: string
        }
        Insert: {
          currency?: string
          id?: string
          input_per_1k?: number
          model: string
          output_per_1k?: number
          updated_at?: string
        }
        Update: {
          currency?: string
          id?: string
          input_per_1k?: number
          model?: string
          output_per_1k?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          count: number
          created_at: string
          endpoint_id: string | null
          id: string
          tokens: number
          user_id: string | null
          window_key: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          endpoint_id?: string | null
          id?: string
          tokens?: number
          user_id?: string | null
          window_key: string
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string
          endpoint_id?: string | null
          id?: string
          tokens?: number
          user_id?: string | null
          window_key?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_counters_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "ai_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_providers: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          display_name: string
          enabled: boolean
          id: string
          is_default: boolean
          provider: Database["public"]["Enums"]["storage_provider"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          provider: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          provider?: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          ai_analysis: string | null
          ai_summary: string | null
          created_at: string
          extracted_data: Json | null
          from_name: string | null
          from_number: string
          id: string
          media_filename: string | null
          media_id: string | null
          media_mime_type: string | null
          media_size: number | null
          media_url: string | null
          message_type: string
          processed_at: string | null
          status: string
          text_content: string | null
          wa_message_id: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_summary?: string | null
          created_at?: string
          extracted_data?: Json | null
          from_name?: string | null
          from_number: string
          id?: string
          media_filename?: string | null
          media_id?: string | null
          media_mime_type?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          processed_at?: string | null
          status?: string
          text_content?: string | null
          wa_message_id?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_summary?: string | null
          created_at?: string
          extracted_data?: Json | null
          from_name?: string | null
          from_number?: string
          id?: string
          media_filename?: string | null
          media_id?: string | null
          media_mime_type?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          processed_at?: string | null
          status?: string
          text_content?: string | null
          wa_message_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_kind: "copilot" | "core" | "prod" | "maint" | "finance" | "custom"
      ai_provider: "azure_openai" | "openai" | "lovable" | "apim"
      app_role: "admin" | "user"
      message_role: "system" | "user" | "assistant" | "tool"
      policy_type:
        | "rate_limit"
        | "quota"
        | "content_filter"
        | "cost_cap"
        | "circuit_breaker"
      storage_provider: "azure_blob" | "aws_s3" | "google_drive" | "supabase"
      usage_status: "success" | "blocked" | "error" | "rate_limited"
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
      agent_kind: ["copilot", "core", "prod", "maint", "finance", "custom"],
      ai_provider: ["azure_openai", "openai", "lovable", "apim"],
      app_role: ["admin", "user"],
      message_role: ["system", "user", "assistant", "tool"],
      policy_type: [
        "rate_limit",
        "quota",
        "content_filter",
        "cost_cap",
        "circuit_breaker",
      ],
      storage_provider: ["azure_blob", "aws_s3", "google_drive", "supabase"],
      usage_status: ["success", "blocked", "error", "rate_limited"],
    },
  },
} as const
