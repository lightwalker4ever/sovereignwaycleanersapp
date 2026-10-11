/**
 * Hand-authored to match the SQL migrations in supabase/migrations/
 * exactly, since the Supabase CLI isn't linked to the project yet.
 *
 * Once `npx supabase link --project-ref <ref>` has been run, regenerate
 * this file for real (and keep it in sync as later migrations add
 * tables) with:
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public \
 *     > src/lib/supabase/database.types.ts
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: Database["public"]["Enums"]["app_role"];
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      email_exists: {
        Args: { check_email: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "client" | "cleaner" | "supervisor" | "manager" | "admin";
    };
    CompositeTypes: Record<string, never>;
  };
};
