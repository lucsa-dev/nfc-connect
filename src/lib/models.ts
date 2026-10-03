import type { Database } from "@/lib/database.types";

type PublicTables = Database["public"]["Tables"];

export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];

export type Business = Tables<"businesses">;
export type Link = Tables<"links">;
export type LinkVisit = Tables<"link_visits">;
