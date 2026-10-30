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
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
      cleaner_availability: {
        Row: {
          id: string;
          cleaner_id: string;
          day_of_week: number;
          window_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cleaner_id: string;
          day_of_week: number;
          window_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cleaner_id?: string;
          day_of_week?: number;
          window_key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cleaner_availability_exceptions: {
        Row: {
          id: string;
          cleaner_id: string;
          date: string;
          window_key: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cleaner_id: string;
          date: string;
          window_key: string;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cleaner_id?: string;
          date?: string;
          window_key?: string;
          type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cleaner_service_areas: {
        Row: {
          id: string;
          cleaner_id: string;
          match_type: "admin_district" | "region" | "postcode_area";
          match_value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cleaner_id: string;
          match_type: "admin_district" | "region" | "postcode_area";
          match_value: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cleaner_id?: string;
          match_type?: "admin_district" | "region" | "postcode_area";
          match_value?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      supervisor_availability: {
        Row: {
          id: string;
          supervisor_id: string;
          day_of_week: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          supervisor_id: string;
          day_of_week: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          supervisor_id?: string;
          day_of_week?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      supervisor_availability_exceptions: {
        Row: {
          id: string;
          supervisor_id: string;
          date: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          supervisor_id: string;
          date: string;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          supervisor_id?: string;
          date?: string;
          type?: string;
          created_at?: string;
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
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
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
          area: string | null;
          photo_required: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          standard_list_id: string;
          title: string;
          description?: string | null;
          area?: string | null;
          photo_required?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          standard_list_id?: string;
          title?: string;
          description?: string | null;
          area?: string | null;
          photo_required?: boolean;
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
          cleaner_id: string | null;
          supervisor_id: string | null;
          status: Database["public"]["Enums"]["cleaning_status"];
          notes: string | null;
          scheduled_at: string;
          ends_at: string | null;
          repeat_weekly: boolean;
          redo_count: number;
          started_at: string | null;
          submitted_at: string | null;
          completed_at: string | null;
          rescheduled_at: string | null;
          requested_date: string | null;
          requested_window: string | null;
          is_flexible: boolean;
          access_method: string | null;
          access_notes: string | null;
          marketing_consent: boolean;
          source: string;
          service: string | null;
          postcode: string | null;
          resume_token: string | null;
          property_answers: Json | null;
          price_breakdown: Json | null;
          decline_reason: string | null;
          reference: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          cleaner_id?: string | null;
          supervisor_id?: string | null;
          status?: Database["public"]["Enums"]["cleaning_status"];
          notes?: string | null;
          scheduled_at?: string;
          ends_at?: string | null;
          repeat_weekly?: boolean;
          redo_count?: number;
          started_at?: string | null;
          submitted_at?: string | null;
          completed_at?: string | null;
          rescheduled_at?: string | null;
          requested_date?: string | null;
          requested_window?: string | null;
          is_flexible?: boolean;
          access_method?: string | null;
          access_notes?: string | null;
          marketing_consent?: boolean;
          source?: string;
          service?: string | null;
          postcode?: string | null;
          resume_token?: string | null;
          property_answers?: Json | null;
          price_breakdown?: Json | null;
          decline_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          cleaner_id?: string | null;
          supervisor_id?: string | null;
          status?: Database["public"]["Enums"]["cleaning_status"];
          notes?: string | null;
          scheduled_at?: string;
          ends_at?: string | null;
          repeat_weekly?: boolean;
          redo_count?: number;
          started_at?: string | null;
          submitted_at?: string | null;
          completed_at?: string | null;
          rescheduled_at?: string | null;
          requested_date?: string | null;
          requested_window?: string | null;
          is_flexible?: boolean;
          access_method?: string | null;
          access_notes?: string | null;
          marketing_consent?: boolean;
          source?: string;
          service?: string | null;
          postcode?: string | null;
          resume_token?: string | null;
          property_answers?: Json | null;
          price_breakdown?: Json | null;
          decline_reason?: string | null;
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
          area: string | null;
          sort_order: number;
          review_status: string;
          supervisor_comment: string | null;
          is_obsolete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cleaning_id: string;
          standard_id?: string | null;
          title: string;
          description?: string | null;
          area?: string | null;
          sort_order?: number;
          review_status?: string;
          supervisor_comment?: string | null;
          is_obsolete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cleaning_id?: string;
          standard_id?: string | null;
          title?: string;
          description?: string | null;
          area?: string | null;
          sort_order?: number;
          review_status?: string;
          supervisor_comment?: string | null;
          is_obsolete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cleaning_photos: {
        Row: {
          id: string;
          cleaning_standard_id: string;
          uploaded_by: string;
          author_role: string;
          storage_path: string;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cleaning_standard_id: string;
          uploaded_by: string;
          author_role: string;
          storage_path: string;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cleaning_standard_id?: string;
          uploaded_by?: string;
          author_role?: string;
          storage_path?: string;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cleaning_comments: {
        Row: {
          id: string;
          cleaning_id: string;
          author_profile_id: string;
          body: string;
          rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cleaning_id: string;
          author_profile_id: string;
          body: string;
          rating?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cleaning_id?: string;
          author_profile_id?: string;
          body?: string;
          rating?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rate_card_items: {
        Row: {
          id: string;
          service: "general" | "end_of_tenancy" | "deep_cleaning" | "office_cleaning";
          group_label: string;
          key: string;
          label: string;
          sublabel: string | null;
          value: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service: "general" | "end_of_tenancy" | "deep_cleaning" | "office_cleaning";
          group_label: string;
          key: string;
          label: string;
          sublabel?: string | null;
          value: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service?: "general" | "end_of_tenancy" | "deep_cleaning" | "office_cleaning";
          group_label?: string;
          key?: string;
          label?: string;
          sublabel?: string | null;
          value?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: unknown;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: unknown;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: unknown;
          updated_at?: string;
        };
        Relationships: [];
      };
      location_multipliers: {
        Row: {
          id: string;
          match_type: "admin_district" | "region" | "postcode_area" | "default";
          match_value: string | null;
          multiplier: number;
          label: string;
          priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_type: "admin_district" | "region" | "postcode_area" | "default";
          match_value?: string | null;
          multiplier?: number;
          label: string;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_type?: "admin_district" | "region" | "postcode_area" | "default";
          match_value?: string | null;
          multiplier?: number;
          label?: string;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_requests: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          service: string;
          property_type: string | null;
          preferred_date: string | null;
          preferred_time: string | null;
          message: string;
          status: "new" | "contacted" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          service: string;
          property_type?: string | null;
          preferred_date?: string | null;
          preferred_time?: string | null;
          message: string;
          status?: "new" | "contacted" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          service?: string;
          property_type?: string | null;
          preferred_date?: string | null;
          preferred_time?: string | null;
          message?: string;
          status?: "new" | "contacted" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_request_notes: {
        Row: {
          id: string;
          contact_request_id: string;
          status: "contacted" | "closed";
          note: string;
          author_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_request_id: string;
          status: "contacted" | "closed";
          note: string;
          author_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_request_id?: string;
          status?: "contacted" | "closed";
          note?: string;
          author_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quote_requests: {
        Row: {
          id: string;
          service: "domestic_cleaning" | "commercial_cleaning" | "carpet_cleaning" | "after_build_clean" | "builders_sparkle_clean" | "move_in_out";
          client_id: string;
          postcode: string;
          answers: Json;
          notes: string | null;
          marketing_consent: boolean;
          status: "draft" | "awaiting_quote" | "quoted" | "declined" | "converted";
          quoted_price: number | null;
          quoted_at: string | null;
          decline_reason: string | null;
          cleaning_id: string | null;
          reference: string;
          resume_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service: "domestic_cleaning" | "commercial_cleaning" | "carpet_cleaning" | "after_build_clean" | "builders_sparkle_clean" | "move_in_out";
          client_id: string;
          postcode: string;
          answers: Json;
          notes?: string | null;
          marketing_consent?: boolean;
          status?: "draft" | "awaiting_quote" | "quoted" | "declined" | "converted";
          quoted_price?: number | null;
          quoted_at?: string | null;
          decline_reason?: string | null;
          cleaning_id?: string | null;
          resume_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service?: "domestic_cleaning" | "commercial_cleaning" | "carpet_cleaning" | "after_build_clean" | "builders_sparkle_clean" | "move_in_out";
          client_id?: string;
          postcode?: string;
          answers?: Json;
          notes?: string | null;
          marketing_consent?: boolean;
          status?: "draft" | "awaiting_quote" | "quoted" | "declined" | "converted";
          quoted_price?: number | null;
          quoted_at?: string | null;
          decline_reason?: string | null;
          cleaning_id?: string | null;
          resume_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_request_photos: {
        Row: {
          id: string;
          quote_request_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_request_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_request_id?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      coverage_waitlist: {
        Row: {
          id: string;
          postcode: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          postcode: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          postcode?: string;
          email?: string;
          created_at?: string;
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
      app_role: "client" | "cleaner" | "supervisor" | "manager" | "admin" | "sales";
      cleaning_status:
        | "quoted"
        | "awaiting_confirmation"
        | "assigned"
        | "in_progress"
        | "in_review"
        | "completed"
        | "declined";
    };
    CompositeTypes: Record<string, never>;
  };
};
