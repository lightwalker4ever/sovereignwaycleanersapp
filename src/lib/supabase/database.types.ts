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
      clients: {
        Row: {
          id: string;
          profile_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      standard_lists: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      standards: {
        Row: {
          id: string;
          standard_list_id: string;
          title: string;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          standard_list_id: string;
          title: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          standard_list_id?: string;
          title?: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_standard_assignments: {
        Row: {
          id: string;
          client_id: string;
          standard_list_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          standard_list_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          standard_list_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      client_standard_overrides: {
        Row: {
          id: string;
          client_standard_assignment_id: string;
          standard_id: string;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          client_standard_assignment_id: string;
          standard_id: string;
          enabled?: boolean;
        };
        Update: {
          id?: string;
          client_standard_assignment_id?: string;
          standard_id?: string;
          enabled?: boolean;
        };
        Relationships: [];
      };
      cleanings: {
        Row: {
          id: string;
          client_id: string;
          cleaner_id: string;
          supervisor_id: string;
          status: Database["public"]["Enums"]["cleaning_status"];
          notes: string | null;
          started_at: string | null;
          submitted_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          cleaner_id: string;
          supervisor_id: string;
          status?: Database["public"]["Enums"]["cleaning_status"];
          notes?: string | null;
          started_at?: string | null;
          submitted_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          cleaner_id?: string;
          supervisor_id?: string;
          status?: Database["public"]["Enums"]["cleaning_status"];
          notes?: string | null;
          started_at?: string | null;
          submitted_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cleaning_standards: {
        Row: {
          id: string;
          cleaning_id: string;
          standard_id: string | null;
          title: string;
          description: string | null;
          sort_order: number;
          review_status: string;
          supervisor_comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cleaning_id: string;
          standard_id?: string | null;
          title: string;
          description?: string | null;
          sort_order?: number;
          review_status?: string;
          supervisor_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cleaning_id?: string;
          standard_id?: string | null;
          title?: string;
          description?: string | null;
          sort_order?: number;
          review_status?: string;
          supervisor_comment?: string | null;
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
      cleaning_status: "assigned" | "in_progress" | "in_review" | "completed";
    };
    CompositeTypes: Record<string, never>;
  };
};
