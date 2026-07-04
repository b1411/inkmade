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
      addresses: {
        Row: {
          address: string
          city: string
          created_at: string
          full_name: string | null
          id: string
          is_default: boolean
          phone: string | null
          user_id: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          note: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          note?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          prompt: string
          status: string
          style: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          prompt: string
          status?: string
          style?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          prompt?: string
          status?: string
          style?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_quotas: {
        Row: {
          max_uses: number
          month_year: string
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          max_uses?: number
          month_year: string
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          max_uses?: number
          month_year?: string
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          alias: string | null
          color_hex: string
          color_name: string
          created_at: string
          id: string
          print_method: string | null
          product_id: string
          quantity: number
          shop_access_code: string | null
          shop_item_id: string | null
          size: string
          slug: string
          spec: Json
          title: string
          unit_price: number
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          alias?: string | null
          color_hex?: string
          color_name?: string
          created_at?: string
          id?: string
          print_method?: string | null
          product_id: string
          quantity?: number
          shop_access_code?: string | null
          shop_item_id?: string | null
          size?: string
          slug: string
          spec?: Json
          title: string
          unit_price?: number
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          alias?: string | null
          color_hex?: string
          color_name?: string
          created_at?: string
          id?: string
          print_method?: string | null
          product_id?: string
          quantity?: number
          shop_access_code?: string | null
          shop_item_id?: string | null
          size?: string
          slug?: string
          spec?: Json
          title?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      designer_balances: {
        Row: {
          available: number
          designer_id: string
          total_earned: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          available?: number
          designer_id: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          available?: number
          designer_id?: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      designer_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          joined_at: string | null
          note: string | null
          royalty_pct: number
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          note?: string | null
          royalty_pct?: number
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          note?: string | null
          royalty_pct?: number
          status?: string
          token?: string
        }
        Relationships: []
      }
      designer_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          invited_by: string | null
          is_public: boolean
          joined_at: string
          payout_details: Json | null
          royalty_pct: number
          status: string
          tax_status: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          invited_by?: string | null
          is_public?: boolean
          joined_at?: string
          payout_details?: Json | null
          royalty_pct?: number
          status?: string
          tax_status?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invited_by?: string | null
          is_public?: boolean
          joined_at?: string
          payout_details?: Json | null
          royalty_pct?: number
          status?: string
          tax_status?: string
        }
        Relationships: []
      }
      designs: {
        Row: {
          ai_generation_id: string | null
          created_at: string
          id: string
          is_saved: boolean
          moderation_status: string
          origin: string
          original_url: string | null
          parent_design_id: string | null
          preview_url: string | null
          print_file_url: string | null
          product_id: string
          share_token: string | null
          spec: Json
          title: string | null
          user_id: string
          variant_id: string | null
        }
        Insert: {
          ai_generation_id?: string | null
          created_at?: string
          id?: string
          is_saved?: boolean
          moderation_status?: string
          origin?: string
          original_url?: string | null
          parent_design_id?: string | null
          preview_url?: string | null
          print_file_url?: string | null
          product_id: string
          share_token?: string | null
          spec?: Json
          title?: string | null
          user_id: string
          variant_id?: string | null
        }
        Update: {
          ai_generation_id?: string | null
          created_at?: string
          id?: string
          is_saved?: boolean
          moderation_status?: string
          origin?: string
          original_url?: string | null
          parent_design_id?: string | null
          preview_url?: string | null
          print_file_url?: string | null
          product_id?: string
          share_token?: string | null
          spec?: Json
          title?: string | null
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_ai_generation_id_fkey"
            columns: ["ai_generation_id"]
            isOneToOne: false
            referencedRelation: "ai_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_parent_design_id_fkey"
            columns: ["parent_design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
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
      favorites: {
        Row: {
          created_at: string
          id: string
          print_id: string | null
          product_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          print_id?: string | null
          product_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          print_id?: string | null
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_print_id_fkey"
            columns: ["print_id"]
            isOneToOne: false
            referencedRelation: "print_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          created_at: string
          currency: string
          designer_id: string | null
          entry_type: string
          id: string
          note: string | null
          order_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          designer_id?: string | null
          entry_type: string
          id?: string
          note?: string | null
          order_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          designer_id?: string | null
          entry_type?: string
          id?: string
          note?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      order_evidence: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          order_id: string
          path: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          order_id: string
          path: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          order_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_evidence_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          design_id: string | null
          id: string
          line_discount: number
          order_id: string
          print_id: string | null
          print_method: string | null
          print_owner_id: string | null
          quantity: number
          shop_id: string | null
          unit_cost: number
          unit_markup: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          design_id?: string | null
          id?: string
          line_discount?: number
          order_id: string
          print_id?: string | null
          print_method?: string | null
          print_owner_id?: string | null
          quantity?: number
          shop_id?: string | null
          unit_cost?: number
          unit_markup?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          design_id?: string | null
          id?: string
          line_discount?: number
          order_id?: string
          print_id?: string | null
          print_method?: string | null
          print_owner_id?: string | null
          quantity?: number
          shop_id?: string | null
          unit_cost?: number
          unit_markup?: number
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
            foreignKeyName: "order_items_print_id_fkey"
            columns: ["print_id"]
            isOneToOne: false
            referencedRelation: "print_library"
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
      order_requests: {
        Row: {
          created_at: string
          id: string
          kind: string
          order_id: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          order_id: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          order_id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_applications: {
        Row: {
          admin_note: string | null
          audience: string | null
          comment: string | null
          contact_name: string
          created_at: string
          desired_slug: string | null
          email: string
          id: string
          org_name: string
          phone: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          audience?: string | null
          comment?: string | null
          contact_name: string
          created_at?: string
          desired_slug?: string | null
          email: string
          id?: string
          org_name: string
          phone: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          audience?: string | null
          comment?: string | null
          contact_name?: string
          created_at?: string
          desired_slug?: string | null
          email?: string
          id?: string
          org_name?: string
          phone?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          access_code: string | null
          application_id: string | null
          claim_email: string | null
          claim_token: string | null
          contacts: Json
          created_at: string
          hero: Json
          id: string
          is_public: boolean
          layout: Json
          logo_url: string | null
          name: string
          owner_id: string | null
          revenue_share_pct: number
          slug: string
          status: string
          theme: Json
        }
        Insert: {
          access_code?: string | null
          application_id?: string | null
          claim_email?: string | null
          claim_token?: string | null
          contacts?: Json
          created_at?: string
          hero?: Json
          id?: string
          is_public?: boolean
          layout?: Json
          logo_url?: string | null
          name: string
          owner_id?: string | null
          revenue_share_pct?: number
          slug: string
          status?: string
          theme?: Json
        }
        Update: {
          access_code?: string | null
          application_id?: string | null
          claim_email?: string | null
          claim_token?: string | null
          contacts?: Json
          created_at?: string
          hero?: Json
          id?: string
          is_public?: boolean
          layout?: Json
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          revenue_share_pct?: number
          slug?: string
          status?: string
          theme?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shops_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "shop_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          created_at: string
          description: string | null
          design_id: string | null
          id: string
          is_active: boolean
          markup: number
          preview_url: string | null
          price: number
          product_id: string | null
          shop_id: string
          sort: number
          title: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          design_id?: string | null
          id?: string
          is_active?: boolean
          markup?: number
          preview_url?: string | null
          price?: number
          product_id?: string | null
          shop_id: string
          sort?: number
          title: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          design_id?: string | null
          id?: string
          is_active?: boolean
          markup?: number
          preview_url?: string | null
          price?: number
          product_id?: string | null
          shop_id?: string
          sort?: number
          title?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_items_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          shop_id: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          shop_id: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          shop_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_promo_codes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          order_item_id: string | null
          payout_id: string | null
          rate_pct: number
          sale_base: number
          shop_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          order_item_id?: string | null
          payout_id?: string | null
          rate_pct: number
          sale_base: number
          shop_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          order_item_id?: string | null
          payout_id?: string | null
          rate_pct?: number
          sale_base?: number
          shop_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_earnings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_balances: {
        Row: {
          available: number
          shop_id: string
          total_earned: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          available?: number
          shop_id: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          available?: number
          shop_id?: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
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
          discount: number
          fiscal_receipt: Json | null
          gift_hide_price: boolean
          gift_message: string | null
          gift_recipient: string | null
          id: string
          internal_notes: string | null
          is_gift: boolean
          paid_at: string | null
          payment_id: string | null
          promo_code: string | null
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
          discount?: number
          fiscal_receipt?: Json | null
          gift_hide_price?: boolean
          gift_message?: string | null
          gift_recipient?: string | null
          id?: string
          internal_notes?: string | null
          is_gift?: boolean
          paid_at?: string | null
          payment_id?: string | null
          promo_code?: string | null
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
          discount?: number
          fiscal_receipt?: Json | null
          gift_hide_price?: boolean
          gift_message?: string | null
          gift_recipient?: string | null
          id?: string
          internal_notes?: string | null
          is_gift?: boolean
          paid_at?: string | null
          payment_id?: string | null
          promo_code?: string | null
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
      payouts: {
        Row: {
          amount: number
          designer_id: string
          details: Json | null
          id: string
          method: string | null
          paid_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          designer_id: string
          details?: Json | null
          id?: string
          method?: string | null
          paid_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          designer_id?: string
          details?: Json | null
          id?: string
          method?: string | null
          paid_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      print_library: {
        Row: {
          author: string | null
          compatible_methods: string[]
          file_url: string
          id: string
          is_active: boolean
          moderation_note: string | null
          moderation_status: string
          owner_id: string | null
          royalty_pct: number
          shop_id: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          author?: string | null
          compatible_methods?: string[]
          file_url: string
          id?: string
          is_active?: boolean
          moderation_note?: string | null
          moderation_status?: string
          owner_id?: string | null
          royalty_pct?: number
          shop_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          author?: string | null
          compatible_methods?: string[]
          file_url?: string
          id?: string
          is_active?: boolean
          moderation_note?: string | null
          moderation_status?: string
          owner_id?: string | null
          royalty_pct?: number
          shop_id?: string | null
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
          alt: string | null
          color_hex: string | null
          id: string
          is_hidden: boolean
          is_primary: boolean
          kind: string
          label: string | null
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          color_hex?: string | null
          id?: string
          is_hidden?: boolean
          is_primary?: boolean
          kind?: string
          label?: string | null
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          color_hex?: string | null
          id?: string
          is_hidden?: boolean
          is_primary?: boolean
          kind?: string
          label?: string | null
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
          is_featured: boolean
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
          is_featured?: boolean
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
          is_featured?: boolean
          max_print_mm?: Json | null
          max_size_label?: string | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          marketing_consent: boolean
          phone: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          marketing_consent?: boolean
          phone?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          marketing_consent?: boolean
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          used_count?: number
        }
        Relationships: []
      }
      royalty_earnings: {
        Row: {
          amount: number
          created_at: string
          designer_id: string
          id: string
          order_id: string | null
          order_item_id: string | null
          payout_id: string | null
          print_id: string | null
          rate_pct: number
          sale_base: number
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          designer_id: string
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          payout_id?: string | null
          print_id?: string | null
          rate_pct: number
          sale_base: number
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          designer_id?: string
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          payout_id?: string | null
          print_id?: string | null
          rate_pct?: number
          sale_base?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_earnings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_earnings_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_earnings_print_id_fkey"
            columns: ["print_id"]
            isOneToOne: false
            referencedRelation: "print_library"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_rate_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          designer_id: string
          id: string
          new_pct: number
          old_pct: number | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          designer_id: string
          id?: string
          new_pct: number
          old_pct?: number | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          designer_id?: string
          id?: string
          new_pct?: number
          old_pct?: number | null
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
      user_consents: {
        Row: {
          accepted_at: string
          consent_type: string
          doc_version: string
          id: string
          ip: string | null
          order_id: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          consent_type: string
          doc_version: string
          id?: string
          ip?: string | null
          order_id?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          consent_type?: string
          doc_version?: string
          id?: string
          ip?: string | null
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          blank_cost: number
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
          blank_cost?: number
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
          blank_cost?: number
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
      adjust_stock: {
        Args: { p_delta: number; p_reason: string; p_variant_id: string }
        Returns: number
      }
      anonymize_account: {
        Args: { p_uid: string }
        Returns: undefined
      }
      admin_customer: { Args: { p_id: string }; Returns: Json }
      admin_finance_series: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_finance_stats: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_list_customers: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_order_at: string
          marketing_consent: boolean
          orders_count: number
          phone: string
          total_spent: number
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          banned_until: string
          created_at: string
          email: string
          full_name: string
          id: string
          marketing_consent: boolean
          phone: string
          role: string
        }[]
      }
      admin_margin_breakdown: { Args: never; Returns: Json }
      admin_stats: { Args: never; Returns: Json }
      admin_create_shop: {
        Args: { p_app_id: string; p_name: string; p_revenue_share?: number; p_slug: string }
        Returns: Json
      }
      admin_list_shops: {
        Args: never
        Returns: {
          access_code: string | null
          application_id: string | null
          claim_email: string | null
          claim_token: string | null
          contacts: Json
          created_at: string
          hero: Json
          id: string
          is_public: boolean
          layout: Json
          logo_url: string | null
          name: string
          owner_id: string | null
          revenue_share_pct: number
          slug: string
          status: string
          theme: Json
        }[]
      }
      admin_reissue_shop_claim: { Args: { p_shop_id: string }; Returns: Json }
      is_reserved_shop_slug: { Args: { p_slug: string }; Returns: boolean }
      shop_storefront: {
        Args: { p_code?: string; p_slug: string }
        Returns: Json
      }
      shop_item_buy_payload: {
        Args: { p_code?: string; p_item_id: string; p_variant_id?: string }
        Returns: Json
      }
      apply_paid: {
        Args: { p_order_id: string; p_provider_txn: string; p_raw: Json }
        Returns: Json
      }
      bump_ai_quota: {
        Args: { p_max: number; p_month: string; p_user_id: string }
        Returns: boolean
      }
      bump_promo_use: { Args: { p_code: string }; Returns: boolean }
      change_order_status: {
        Args: {
          p_actor: string
          p_carrier: string
          p_note: string
          p_order_id: string
          p_to: string
          p_tracking: string
        }
        Returns: Json
      }
      claim_designer_invite: { Args: { p_token: string }; Returns: Json }
      claim_shop: { Args: { p_token: string }; Returns: Json }
      shop_orders: { Args: { p_shop_id: string }; Returns: Json }
      shop_track: { Args: { p_item_id?: string; p_shop_id: string; p_type: string }; Returns: undefined }
      shop_analytics: { Args: { p_days?: number; p_shop_id: string }; Returns: Json }
      shop_promo_validate: { Args: { p_code: string; p_shop_id: string; p_subtotal: number }; Returns: Json }
      mark_payout_paid: { Args: { p_payout_id: string }; Returns: undefined }
      refund_ai_quota: {
        Args: { p_month: string; p_user_id: string }
        Returns: undefined
      }
      public_designer_profile: {
        Args: { p_id: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          display_name: string | null
          id: string
        }[]
      }
      refund_order: {
        Args: { p_note?: string; p_order_id: string }
        Returns: Json
      }
      request_payout: {
        Args: { p_amount: number; p_details?: Json; p_method?: string }
        Returns: string
      }
      set_royalty_rate: {
        Args: { p_designer_id: string; p_new_pct: number }
        Returns: undefined
      }
      studio_get_order: { Args: { p_id: string }; Returns: Json }
      studio_list_queue: {
        Args: never
        Returns: {
          carrier: string
          created_at: string
          customer_name: string | null
          id: string
          item_count: number
          status: string
          tracking_no: string
        }[]
      }
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
