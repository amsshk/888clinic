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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      access_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          credits_after: number | null
          credits_before: number | null
          detail: string | null
          free_after: number | null
          free_before: number | null
          granted: boolean | null
          id: string
          role: string | null
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          credits_after?: number | null
          credits_before?: number | null
          detail?: string | null
          free_after?: number | null
          free_before?: number | null
          granted?: boolean | null
          id?: string
          role?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          credits_after?: number | null
          credits_before?: number | null
          detail?: string | null
          free_after?: number | null
          free_before?: number | null
          granted?: boolean | null
          id?: string
          role?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          actives: string[]
          available: boolean
          category: string | null
          created_at: string
          credits: number | null
          id: string
          kind: string
          name: string
          note: string | null
          once_price_id: string | null
          price_thb: number
          refill_price_id: string | null
          refill_thb: number | null
          size: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actives?: string[]
          available?: boolean
          category?: string | null
          created_at?: string
          credits?: number | null
          id: string
          kind: string
          name: string
          note?: string | null
          once_price_id?: string | null
          price_thb?: number
          refill_price_id?: string | null
          refill_thb?: number | null
          size?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actives?: string[]
          available?: boolean
          category?: string | null
          created_at?: string
          credits?: number | null
          id?: string
          kind?: string
          name?: string
          note?: string | null
          once_price_id?: string | null
          price_thb?: number
          refill_price_id?: string | null
          refill_thb?: number | null
          size?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      copy_overrides: {
        Row: {
          copy_key: string
          lang: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          copy_key: string
          lang: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          copy_key?: string
          lang?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          amount_thb: number
          created_at: string
          credits: number
          id: string
          paid_at: string | null
          provider: string
          provider_ref: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_thb: number
          created_at?: string
          credits: number
          id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_thb?: number
          created_at?: string
          credits?: number
          id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      engine_settings: {
        Row: {
          allow_language_model_fallback: boolean
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_language_model_fallback?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_language_model_fallback?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          concern: string | null
          confirmation_sent_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          internal_notes: string | null
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          service: string | null
          source: string
          status: string
        }
        Insert: {
          concern?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          internal_notes?: string | null
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          service?: string | null
          source?: string
          status?: string
        }
        Update: {
          concern?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          internal_notes?: string | null
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          service?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      face_identities: {
        Row: {
          created_at: string
          duplicate_of_user_id: string | null
          embedding: string
          id: string
          kind: string
          similarity: number | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicate_of_user_id?: string | null
          embedding: string
          id?: string
          kind?: string
          similarity?: number | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duplicate_of_user_id?: string | null
          embedding?: string
          id?: string
          kind?: string
          similarity?: number | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mali_models: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          storage_path: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          storage_path: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          storage_path?: string
          version?: string
        }
        Relationships: []
      }
      media_items: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          public_url: string
          published: boolean
          results_category: string | null
          show_in_results: boolean
          sort_order: number
          storage_path: string
          tags: string[]
          title: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          public_url: string
          published?: boolean
          results_category?: string | null
          show_in_results?: boolean
          sort_order?: number
          storage_path: string
          tags?: string[]
          title?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          public_url?: string
          published?: boolean
          results_category?: string | null
          show_in_results?: boolean
          sort_order?: number
          storage_path?: string
          tags?: string[]
          title?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price_id: string | null
          product_name: string
          quantity: number
          unit_amount_thb: number
        }
        Insert: {
          id?: string
          order_id: string
          price_id?: string | null
          product_name: string
          quantity?: number
          unit_amount_thb?: number
        }
        Update: {
          id?: string
          order_id?: string
          price_id?: string | null
          product_name?: string
          quantity?: number
          unit_amount_thb?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_thb: number
          created_at: string
          email: string | null
          environment: string
          fulfilment: string
          id: string
          internal_notes: string | null
          phone: string | null
          provider: string
          provider_ref: string
          shipping_address: Json | null
          shipping_name: string | null
          status: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_thb?: number
          created_at?: string
          email?: string | null
          environment?: string
          fulfilment?: string
          id?: string
          internal_notes?: string | null
          phone?: string | null
          provider?: string
          provider_ref: string
          shipping_address?: Json | null
          shipping_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_thb?: number
          created_at?: string
          email?: string | null
          environment?: string
          fulfilment?: string
          id?: string
          internal_notes?: string | null
          phone?: string | null
          provider?: string
          provider_ref?: string
          shipping_address?: Json | null
          shipping_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_report_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          id: string
          patient_hn: string | null
          patient_id: string | null
          patient_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          id?: string
          patient_hn?: string | null
          patient_id?: string | null
          patient_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          id?: string
          patient_hn?: string | null
          patient_id?: string | null
          patient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_report_audit_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          created_at: string
          first_visit: string | null
          full_name: string
          hn: string | null
          id: string
          nickname: string | null
          phone: string | null
          phone_digits: string | null
          treatment_notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          created_at?: string
          first_visit?: string | null
          full_name: string
          hn?: string | null
          id?: string
          nickname?: string | null
          phone?: string | null
          phone_digits?: string | null
          treatment_notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          created_at?: string
          first_visit?: string | null
          full_name?: string
          hn?: string | null
          id?: string
          nickname?: string | null
          phone?: string | null
          phone_digits?: string | null
          treatment_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_subscriptions: {
        Row: {
          amount_thb: number
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string
          fulfilment: string
          id: string
          price_id: string | null
          product_name: string | null
          quantity: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_thb?: number
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          fulfilment?: string
          id?: string
          price_id?: string | null
          product_name?: string | null
          quantity?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_thb?: number
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          fulfilment?: string
          id?: string
          price_id?: string | null
          product_name?: string | null
          quantity?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      report_settings: {
        Row: {
          config: Json
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      scan_wallets: {
        Row: {
          credits: number
          free_scans_remaining: number
          updated_at: string
          user_id: string
        }
        Insert: {
          credits?: number
          free_scans_remaining?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          credits?: number
          free_scans_remaining?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signup_attempts: {
        Row: {
          created_at: string
          email_domain: string | null
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          email_domain?: string | null
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          email_domain?: string | null
          id?: string
          ip?: string
        }
        Relationships: []
      }
      skin_scans: {
        Row: {
          body_area: string | null
          charged: string | null
          concern: string | null
          condition: string | null
          confidence: number | null
          created_at: string
          findings: Json
          id: string
          mali_melanoma_prob: number | null
          mali_model_version: string | null
          mali_nevus_prob: number | null
          mali_primary: boolean
          mali_sk_prob: number | null
          recommendations: Json
          severity: string | null
          status: string
          storage_path: string
          summary: string | null
          urgency: string | null
          user_id: string
        }
        Insert: {
          body_area?: string | null
          charged?: string | null
          concern?: string | null
          condition?: string | null
          confidence?: number | null
          created_at?: string
          findings?: Json
          id?: string
          mali_melanoma_prob?: number | null
          mali_model_version?: string | null
          mali_nevus_prob?: number | null
          mali_primary?: boolean
          mali_sk_prob?: number | null
          recommendations?: Json
          severity?: string | null
          status?: string
          storage_path: string
          summary?: string | null
          urgency?: string | null
          user_id: string
        }
        Update: {
          body_area?: string | null
          charged?: string | null
          concern?: string | null
          condition?: string | null
          confidence?: number | null
          created_at?: string
          findings?: Json
          id?: string
          mali_melanoma_prob?: number | null
          mali_model_version?: string | null
          mali_nevus_prob?: number | null
          mali_primary?: boolean
          mali_sk_prob?: number | null
          recommendations?: Json
          severity?: string | null
          status?: string
          storage_path?: string
          summary?: string | null
          urgency?: string | null
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_scan_credit: { Args: { _user_id: string }; Returns: string }
      fulfill_credit_purchase: {
        Args: {
          _amount_thb: number
          _credits: number
          _provider?: string
          _provider_ref: string
          _user_id: string
        }
        Returns: boolean
      }
      fulfill_product_order: {
        Args: {
          _amount_thb: number
          _email: string
          _environment: string
          _fulfilment: string
          _items: Json
          _phone: string
          _provider_ref: string
          _shipping_address: Json
          _shipping_name: string
          _stripe_customer_id: string
          _user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      match_face_identity: {
        Args: { _embedding: string; _exclude_user: string; _threshold?: number }
        Returns: {
          matched_user_id: string
          similarity: number
        }[]
      }
      refund_scan_credit: {
        Args: { _kind: string; _user_id: string }
        Returns: undefined
      }
      upsert_product_subscription: {
        Args: {
          _amount_thb: number
          _cancel_at_period_end: boolean
          _current_period_end: string
          _environment: string
          _fulfilment: string
          _price_id: string
          _product_name: string
          _quantity: number
          _status: string
          _stripe_customer_id: string
          _stripe_subscription_id: string
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
