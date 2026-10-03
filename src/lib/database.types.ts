// Tipos do banco no formato gerado por `supabase gen types typescript`.
// Para regenerar: npm run db:types (requer Supabase CLI e projeto vinculado).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type LinkTypeEnum = "review" | "pix" | "business_card" | "other";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      links: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          slug: string;
          type: LinkTypeEnum;
          url: string | null;
          is_active: boolean;
          click_count: number;
          pix_key: string | null;
          pix_name: string | null;
          pix_city: string | null;
          pix_amount: number | null;
          pix_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          slug: string;
          type?: LinkTypeEnum;
          url?: string | null;
          is_active?: boolean;
          pix_key?: string | null;
          pix_name?: string | null;
          pix_city?: string | null;
          pix_amount?: number | null;
          pix_description?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          type?: LinkTypeEnum;
          url?: string | null;
          is_active?: boolean;
          pix_key?: string | null;
          pix_name?: string | null;
          pix_city?: string | null;
          pix_amount?: number | null;
          pix_description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "links_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      link_visits: {
        Row: {
          id: number;
          link_id: string;
          business_id: string;
          created_at: string;
          source: "nfc" | "qr";
          ip_hash: string | null;
          user_agent: string | null;
          browser: string | null;
          browser_version: string | null;
          os: string | null;
          os_version: string | null;
          device_type: string | null;
          device_vendor: string | null;
          is_bot: boolean;
          language: string | null;
          referer: string | null;
          country: string | null;
          region: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
        };
        Insert: {
          link_id: string;
          business_id: string;
          created_at?: string;
          source?: "nfc" | "qr";
          ip_hash?: string | null;
          user_agent?: string | null;
          browser?: string | null;
          browser_version?: string | null;
          os?: string | null;
          os_version?: string | null;
          device_type?: string | null;
          device_vendor?: string | null;
          is_bot?: boolean;
          language?: string | null;
          referer?: string | null;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "link_visits_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_visits_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { link_type: LinkTypeEnum };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Business = Tables<"businesses">;
export type Link = Tables<"links">;
export type LinkVisit = Tables<"link_visits">;
