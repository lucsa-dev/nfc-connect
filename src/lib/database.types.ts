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
      businesses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          maps_query: string | null
          name: string
          owner_id: string
          place_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          maps_query?: string | null
          name: string
          owner_id?: string
          place_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          maps_query?: string | null
          name?: string
          owner_id?: string
          place_id?: string | null
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
          code: string
          created_at: string
          id: string
          link_id: string | null
          owner_id: string
          position: number
        }
        Insert: {
          activated_at?: string | null
          batch_id: string
          code: string
          created_at?: string
          id?: string
          link_id?: string | null
          owner_id?: string
          position: number
        }
        Update: {
          activated_at?: string | null
          batch_id?: string
          code?: string
          created_at?: string
          id?: string
          link_id?: string | null
          owner_id?: string
          position?: number
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
            foreignKeyName: "cards_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string | null
          card_model: string | null
          cards: number | null
          clients_band: string | null
          contact_name: string | null
          counters: number | null
          created_at: string
          estimate: string | null
          goal: number | null
          id: string
          marketing_consent: boolean
          notes: string | null
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
          clients_band?: string | null
          contact_name?: string | null
          counters?: number | null
          created_at?: string
          estimate?: string | null
          goal?: number | null
          id?: string
          marketing_consent?: boolean
          notes?: string | null
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
          clients_band?: string | null
          contact_name?: string | null
          counters?: number | null
          created_at?: string
          estimate?: string | null
          goal?: number | null
          id?: string
          marketing_consent?: boolean
          notes?: string | null
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
          link_id: string
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
          link_id: string
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
          link_id?: string
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
      place_snapshots: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          business_id: string
          created_at: string
          id: number
          place_id: string
          profile: Json
          rating: number | null
          reviews: number | null
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          business_id: string
          created_at?: string
          id?: never
          place_id: string
          profile?: Json
          rating?: number | null
          reviews?: number | null
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          business_id?: string
          created_at?: string
          id?: never
          place_id?: string
          profile?: Json
          rating?: number | null
          reviews?: number | null
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
      [_ in never]: never
    }
    Enums: {
      link_type: "review" | "pix" | "business_card" | "other"
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
      link_type: ["review", "pix", "business_card", "other"],
    },
  },
} as const
