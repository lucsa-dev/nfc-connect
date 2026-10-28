// Gerado por: npm run db:types (não edite à mão; atalhos em src/lib/models.ts)
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          email: string
          phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email: string
          phone?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          maps_query: string | null
          meta_pixel_id: string | null
          name: string
          owner_id: string
          place_id: string | null
          plan_expires_at: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          maps_query?: string | null
          meta_pixel_id?: string | null
          name: string
          owner_id?: string
          place_id?: string | null
          plan_expires_at?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          maps_query?: string | null
          meta_pixel_id?: string | null
          name?: string
          owner_id?: string
          place_id?: string | null
          plan_expires_at?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      card_batches: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          product: string
          quantity: number
          style: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          product: string
          quantity: number
          style: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          product?: string
          quantity?: number
          style?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          activated_at: string | null
          batch_id: string
          business_id: string | null
          code: string
          created_at: string
          direct_link_id: string | null
          id: string
          owner_id: string
          position: number
          visit_count: number
        }
        Insert: {
          activated_at?: string | null
          batch_id: string
          business_id?: string | null
          code: string
          created_at?: string
          direct_link_id?: string | null
          id?: string
          owner_id?: string
          position: number
          visit_count?: number
        }
        Update: {
          activated_at?: string | null
          batch_id?: string
          business_id?: string | null
          code?: string
          created_at?: string
          direct_link_id?: string | null
          id?: string
          owner_id?: string
          position?: number
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cards_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "card_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_direct_link_fkey"
            columns: ["direct_link_id", "business_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string | null
          card_model: string | null
          cards: number | null
          checkout_id: string | null
          clients_band: string | null
          contact_name: string | null
          counters: number | null
          created_at: string
          estimate: string | null
          goal: number | null
          id: string
          marketing_consent: boolean
          notes: string | null
          paid_at: string | null
          payment_status: string | null
          place_address: string | null
          place_category: string | null
          place_city: string | null
          place_id: string | null
          place_last_review_at: string | null
          place_maps_url: string | null
          place_name: string | null
          place_rating: number | null
          place_reviews: number | null
          place_state: string | null
          plaque_model: string | null
          plaques: number | null
          session_id: string
          spots: string[]
          status: string
          step: string | null
          stickers: number | null
          style: string | null
          tables: number | null
          total_cents: number | null
          updated_at: string
          utm: Json
          whatsapp: string | null
        }
        Insert: {
          business_id?: string | null
          card_model?: string | null
          cards?: number | null
          checkout_id?: string | null
          clients_band?: string | null
          contact_name?: string | null
          counters?: number | null
          created_at?: string
          estimate?: string | null
          goal?: number | null
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_status?: string | null
          place_address?: string | null
          place_category?: string | null
          place_city?: string | null
          place_id?: string | null
          place_last_review_at?: string | null
          place_maps_url?: string | null
          place_name?: string | null
          place_rating?: number | null
          place_reviews?: number | null
          place_state?: string | null
          plaque_model?: string | null
          plaques?: number | null
          session_id: string
          spots?: string[]
          status?: string
          step?: string | null
          stickers?: number | null
          style?: string | null
          tables?: number | null
          total_cents?: number | null
          updated_at?: string
          utm?: Json
          whatsapp?: string | null
        }
        Update: {
          business_id?: string | null
          card_model?: string | null
          cards?: number | null
          checkout_id?: string | null
          clients_band?: string | null
          contact_name?: string | null
          counters?: number | null
          created_at?: string
          estimate?: string | null
          goal?: number | null
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          paid_at?: string | null
          payment_status?: string | null
          place_address?: string | null
          place_category?: string | null
          place_city?: string | null
          place_id?: string | null
          place_last_review_at?: string | null
          place_maps_url?: string | null
          place_name?: string | null
          place_rating?: number | null
          place_reviews?: number | null
          place_state?: string | null
          plaque_model?: string | null
          plaques?: number | null
          session_id?: string
          spots?: string[]
          status?: string
          step?: string | null
          stickers?: number | null
          style?: string | null
          tables?: number | null
          total_cents?: number | null
          updated_at?: string
          utm?: Json
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      link_visits: {
        Row: {
          browser: string | null
          browser_version: string | null
          business_id: string
          card_id: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          device_vendor: string | null
          id: number
          ip_hash: string | null
          is_bot: boolean
          language: string | null
          latitude: number | null
          link_id: string | null
          longitude: number | null
          os: string | null
          os_version: string | null
          referer: string | null
          region: string | null
          source: string
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          business_id: string
          card_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          device_vendor?: string | null
          id?: never
          ip_hash?: string | null
          is_bot?: boolean
          language?: string | null
          latitude?: number | null
          link_id?: string | null
          longitude?: number | null
          os?: string | null
          os_version?: string | null
          referer?: string | null
          region?: string | null
          source?: string
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          business_id?: string
          card_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          device_vendor?: string | null
          id?: never
          ip_hash?: string | null
          is_bot?: boolean
          language?: string | null
          latitude?: number | null
          link_id?: string | null
          longitude?: number | null
          os?: string | null
          os_version?: string | null
          referer?: string | null
          region?: string | null
          source?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_visits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_visits_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_visits_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          business_id: string
          click_count: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          pix_amount: number | null
          pix_city: string | null
          pix_description: string | null
          pix_key: string | null
          pix_name: string | null
          slug: string
          type: Database["public"]["Enums"]["link_type"]
          updated_at: string
          url: string | null
          wifi_password: string | null
          wifi_ssid: string | null
        }
        Insert: {
          business_id: string
          click_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pix_amount?: number | null
          pix_city?: string | null
          pix_description?: string | null
          pix_key?: string | null
          pix_name?: string | null
          slug: string
          type?: Database["public"]["Enums"]["link_type"]
          updated_at?: string
          url?: string | null
          wifi_password?: string | null
          wifi_ssid?: string | null
        }
        Update: {
          business_id?: string
          click_count?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pix_amount?: number | null
          pix_city?: string | null
          pix_description?: string | null
          pix_key?: string | null
          pix_name?: string | null
          slug?: string
          type?: Database["public"]["Enums"]["link_type"]
          updated_at?: string
          url?: string | null
          wifi_password?: string | null
          wifi_ssid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      maps_searches: {
        Row: {
          created_at: string
          id: number
          ip_hash: string | null
          query: string
          results: Json
        }
        Insert: {
          created_at?: string
          id?: never
          ip_hash?: string | null
          query: string
          results?: Json
        }
        Update: {
          created_at?: string
          id?: never
          ip_hash?: string | null
          query?: string
          results?: Json
        }
        Relationships: []
      }
      market_reports: {
        Row: {
          analysis: Json | null
          area: string
          business_id: string | null
          created_at: string
          data: Json | null
          error: string | null
          finished_at: string | null
          id: string
          name: string
          owner_id: string
          place_id: string
          run_id: string | null
          status: string
          term: string
          token: string
        }
        Insert: {
          analysis?: Json | null
          area: string
          business_id?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          name: string
          owner_id?: string
          place_id: string
          run_id?: string | null
          status?: string
          term: string
          token?: string
        }
        Update: {
          analysis?: Json | null
          area?: string
          business_id?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          place_id?: string
          run_id?: string | null
          status?: string
          term?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      place_snapshots: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          business_id: string
          created_at: string
          expires_at: string | null
          id: number
          place_id: string
          profile: Json
          rating: number | null
          reviews: number | null
          source: string
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: never
          place_id: string
          profile?: Json
          rating?: number | null
          reviews?: number | null
          source?: string
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: never
          place_id?: string
          profile?: Json
          rating?: number | null
          reviews?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_snapshots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_searches: {
        Row: {
          area: string
          center_lat: number | null
          center_lng: number | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          owner_id: string
          radius_m: number | null
          results: Json
          run_id: string | null
          status: string
          term: string
        }
        Insert: {
          area: string
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          owner_id?: string
          radius_m?: number | null
          results?: Json
          run_id?: string | null
          status?: string
          term: string
        }
        Update: {
          area?: string
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          owner_id?: string
          radius_m?: number | null
          results?: Json
          run_id?: string | null
          status?: string
          term?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          contact_name: string | null
          contacted_at: string | null
          created_at: string
          data: Json
          email: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          place_id: string
          price_cents: number | null
          proposal_note: string | null
          search_id: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_name?: string | null
          contacted_at?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          place_id: string
          price_cents?: number | null
          proposal_note?: string | null
          search_id?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_name?: string | null
          contacted_at?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          place_id?: string
          price_cents?: number | null
          proposal_note?: string | null
          search_id?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "prospect_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_grids: {
        Row: {
          center_lat: number
          center_lng: number
          created_at: string
          expires_at: string
          id: number
          points: Json
          report_id: string
          size: number
          spacing_m: number
          term: string
        }
        Insert: {
          center_lat: number
          center_lng: number
          created_at?: string
          expires_at?: string
          id?: never
          points?: Json
          report_id: string
          size: number
          spacing_m: number
          term: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          created_at?: string
          expires_at?: string
          id?: never
          points?: Json
          report_id?: string
          size?: number
          spacing_m?: number
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_grids_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "market_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: boolean
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          id?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          id?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_member: { Args: { target: string }; Returns: boolean }
      user_id_by_email: { Args: { target: string }; Returns: string }
    }
    Enums: {
      link_type: "review" | "pix" | "business_card" | "other" | "wifi"
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
    Enums: {
      link_type: ["review", "pix", "business_card", "other", "wifi"],
    },
  },
} as const
