// АВТОГЕНЕРАЦИЯ (Supabase). Не редактировать вручную.
// Регенерация: `supabase gen types typescript --project-id jpxiuyinqhokzzcqbggf > app/types/database.types.ts`
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
      designs: {
        Row: {
          created_at: string
          id: string
          is_saved: boolean
          original_url: string | null
          preview_url: string | null
          print_file_url: string | null
          product_id: string
          share_token: string | null
          spec: Json
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_saved?: boolean
          original_url?: string | null
          preview_url?: string | null
          print_file_url?: string | null
          product_id: string
          share_token?: string | null
          spec?: Json
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_saved?: boolean
          original_url?: string | null
          preview_url?: string | null
          print_file_url?: string | null
          product_id?: string
          share_token?: string | null
          spec?: Json
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          fabric_type: string
          id: string
          name: string
          print_method: string
          print_mode: string
          product_id: string
          surcharge: number
        }
        Insert: {
          fabric_type: string
          id?: string
          name: string
          print_method: string
          print_mode: string
          product_id: string
          surcharge?: number
        }
        Update: {
          fabric_type?: string
          id?: string
          name?: string
          print_method?: string
          print_mode?: string
          product_id?: string
          surcharge?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          design_id: string | null
          id: string
          order_id: string
          print_method: string | null
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          design_id?: string | null
          id?: string
          order_id: string
          print_method?: string | null
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          design_id?: string | null
          id?: string
          order_id?: string
          print_method?: string | null
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_log: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          carrier: string | null
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_id: string | null
          shipped_at: string | null
          shipping_addr: Json | null
          status: string
          total: number
          tracking_no: string | null
          user_id: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          shipped_at?: string | null
          shipping_addr?: Json | null
          status?: string
          total?: number
          tracking_no?: string | null
          user_id: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          shipped_at?: string | null
          shipping_addr?: Json | null
          status?: string
          total?: number
          tracking_no?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          provider: string
          provider_txn: string | null
          raw_payload: Json | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          provider: string
          provider_txn?: string | null
          raw_payload?: Json | null
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          provider?: string
          provider_txn?: string | null
          raw_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      print_library: {
        Row: {
          author: string | null
          file_url: string
          id: string
          is_active: boolean
          royalty_pct: number
          tags: string[]
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          author?: string | null
          file_url: string
          id?: string
          is_active?: boolean
          royalty_pct?: number
          tags?: string[]
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          author?: string | null
          file_url?: string
          id?: string
          is_active?: boolean
          royalty_pct?: number
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      print_zones: {
        Row: {
          bounds_mm: Json
          id: string
          max_height_mm: number | null
          max_width_mm: number | null
          min_dpi: number
          mockup_url: string | null
          name: string
          placement_hint: string | null
          print_mode: string
          product_id: string
          title: string
        }
        Insert: {
          bounds_mm: Json
          id?: string
          max_height_mm?: number | null
          max_width_mm?: number | null
          min_dpi?: number
          mockup_url?: string | null
          name: string
          placement_hint?: string | null
          print_mode: string
          product_id: string
          title: string
        }
        Update: {
          bounds_mm?: Json
          id?: string
          max_height_mm?: number | null
          max_width_mm?: number | null
          min_dpi?: number
          mockup_url?: string | null
          name?: string
          placement_hint?: string | null
          print_mode?: string
          product_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_zones_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          alias: string | null
          base_price: number
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_print_mm: Json | null
          max_size_label: string | null
          slug: string
          title: string
        }
        Insert: {
          alias?: string | null
          base_price?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_print_mm?: Json | null
          max_size_label?: string | null
          slug: string
          title: string
        }
        Update: {
          alias?: string | null
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_print_mm?: Json | null
          max_size_label?: string | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: string
          order_id: string | null
          reason: string
          variant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: string
          order_id?: string | null
          reason: string
          variant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          order_id?: string | null
          reason?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          color_hex: string
          color_name: string
          id: string
          material_id: string
          product_id: string
          size: string
          sku: string
          stock: number
        }
        Insert: {
          color_hex: string
          color_name: string
          id?: string
          material_id: string
          product_id: string
          size: string
          sku: string
          stock?: number
        }
        Update: {
          color_hex?: string
          color_name?: string
          id?: string
          material_id?: string
          product_id?: string
          size?: string
          sku?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "variants_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
