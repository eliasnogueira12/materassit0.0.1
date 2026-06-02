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
      assistance_requests: {
        Row: {
          accepted_at: string | null
          created_at: string
          customer_id: string | null
          customer_number: number | null
          expires_at: string | null
          id: string
          kiosk_label: string
          message: string | null
          reason: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_number?: number | null
          expires_at?: string | null
          id?: string
          kiosk_label?: string
          message?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_number?: number | null
          expires_at?: string | null
          id?: string
          kiosk_label?: string
          message?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistance_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_history: {
        Row: {
          created_at: string
          customer_id: string
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          customer_id: string
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          created_at?: string
          customer_id?: string
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "customer_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          blocked: boolean
          created_at: string
          customer_number: number
          id: string
          last_seen_at: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          customer_number: number
          id?: string
          last_seen_at?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          customer_number?: number
          id?: string
          last_seen_at?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      problem_products: {
        Row: {
          display_order: number
          id: string
          problem_id: string
          product_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          problem_id: string
          product_id: string
        }
        Update: {
          display_order?: number
          id?: string
          problem_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_products_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string | null
          safety_warning: string | null
          solution: string | null
          steps: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          safety_warning?: string | null
          solution?: string | null
          steps?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          safety_warning?: string | null
          solution?: string | null
          steps?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_relations: {
        Row: {
          created_at: string
          display_order: number
          id: string
          product_id: string
          related_product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
          related_product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
          related_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          aisle: string | null
          category: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          internal_code: string | null
          keywords: string | null
          name: string
          price: number | null
          promotion_active: boolean
          promotion_price: number | null
          section: string | null
          shelf: string | null
          stock: number
          stock_visible: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          aisle?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          internal_code?: string | null
          keywords?: string | null
          name: string
          price?: number | null
          promotion_active?: boolean
          promotion_price?: number | null
          section?: string | null
          shelf?: string | null
          stock?: number
          stock_visible?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          aisle?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          internal_code?: string | null
          keywords?: string | null
          name?: string
          price?: number | null
          promotion_active?: boolean
          promotion_price?: number | null
          section?: string | null
          shelf?: string | null
          stock?: number
          stock_visible?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_customer: {
        Args: never
        Returns: {
          customer_number: number
          id: string
        }[]
      }
      find_customer: {
        Args: { p_number: number }
        Returns: {
          blocked: boolean
          created_at: string
          customer_number: number
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
