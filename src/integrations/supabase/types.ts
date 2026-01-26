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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      debug_logs: {
        Row: {
          data: Json | null
          function_name: string | null
          id: number
          message: string | null
          timestamp: string | null
        }
        Insert: {
          data?: Json | null
          function_name?: string | null
          id?: number
          message?: string | null
          timestamp?: string | null
        }
        Update: {
          data?: Json | null
          function_name?: string | null
          id?: number
          message?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      division_standings: {
        Row: {
          division_id: string | null
          games_lost: number | null
          games_won: number | null
          id: string
          last_updated: string | null
          matches_lost: number | null
          matches_played: number | null
          matches_won: number | null
          points: number | null
          position: number | null
          sets_lost: number | null
          sets_won: number | null
          team_id: string | null
        }
        Insert: {
          division_id?: string | null
          games_lost?: number | null
          games_won?: number | null
          id?: string
          last_updated?: string | null
          matches_lost?: number | null
          matches_played?: number | null
          matches_won?: number | null
          points?: number | null
          position?: number | null
          sets_lost?: number | null
          sets_won?: number | null
          team_id?: string | null
        }
        Update: {
          division_id?: string | null
          games_lost?: number | null
          games_won?: number | null
          id?: string
          last_updated?: string | null
          matches_lost?: number | null
          matches_played?: number | null
          matches_won?: number | null
          points?: number | null
          position?: number | null
          sets_lost?: number | null
          sets_won?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "division_standings_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string | null
          id: string
          league_id: string
          level: number
          max_teams: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          league_id: string
          level: number
          max_teams?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          league_id?: string
          level?: number
          max_teams?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_registrations: {
        Row: {
          bonus_points: number | null
          division_id: string
          id: string
          league_id: string
          matches_played: number | null
          matches_won: number | null
          points: number | null
          registered_at: string | null
          status: string | null
          team_id: string
        }
        Insert: {
          bonus_points?: number | null
          division_id: string
          id?: string
          league_id: string
          matches_played?: number | null
          matches_won?: number | null
          points?: number | null
          registered_at?: string | null
          status?: string | null
          team_id: string
        }
        Update: {
          bonus_points?: number | null
          division_id?: string
          id?: string
          league_id?: string
          matches_played?: number | null
          matches_won?: number | null
          points?: number | null
          registered_at?: string | null
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_registrations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_registrations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string | null
          created_by: string
          default_match_format: string | null
          description: string | null
          end_date: string
          entry_fee: number | null
          id: string
          match_format: string | null
          max_teams: number | null
          max_teams_per_division: number | null
          name: string
          registration_deadline: string | null
          start_date: string
          status: Database["public"]["Enums"]["league_status"] | null
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          default_match_format?: string | null
          description?: string | null
          end_date: string
          entry_fee?: number | null
          id?: string
          match_format?: string | null
          max_teams?: number | null
          max_teams_per_division?: number | null
          name: string
          registration_deadline?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["league_status"] | null
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          default_match_format?: string | null
          description?: string | null
          end_date?: string
          entry_fee?: number | null
          id?: string
          match_format?: string | null
          max_teams?: number | null
          max_teams_per_division?: number | null
          name?: string
          registration_deadline?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["league_status"] | null
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_confirmations: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          reschedule_reason: string | null
          responded_at: string | null
          response_notes: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          reschedule_reason?: string | null
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          reschedule_reason?: string | null
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_confirmations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_confirmations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results_detailed: {
        Row: {
          admin_notes: string | null
          created_at: string
          dispute_status: string | null
          id: string
          logged_by_team1: boolean | null
          logged_by_team2: boolean | null
          match_format: string | null
          match_id: string | null
          team1_games_set1: number | null
          team1_games_set2: number | null
          team1_games_set3: number | null
          team1_sets: number | null
          team2_games_set1: number | null
          team2_games_set2: number | null
          team2_games_set3: number | null
          team2_sets: number | null
          total_sets_played: number | null
          updated_at: string
          verified_by_admin: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          dispute_status?: string | null
          id?: string
          logged_by_team1?: boolean | null
          logged_by_team2?: boolean | null
          match_format?: string | null
          match_id?: string | null
          team1_games_set1?: number | null
          team1_games_set2?: number | null
          team1_games_set3?: number | null
          team1_sets?: number | null
          team2_games_set1?: number | null
          team2_games_set2?: number | null
          team2_games_set3?: number | null
          team2_sets?: number | null
          total_sets_played?: number | null
          updated_at?: string
          verified_by_admin?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          dispute_status?: string | null
          id?: string
          logged_by_team1?: boolean | null
          logged_by_team2?: boolean | null
          match_format?: string | null
          match_id?: string | null
          team1_games_set1?: number | null
          team1_games_set2?: number | null
          team1_games_set3?: number | null
          team1_sets?: number | null
          team2_games_set1?: number | null
          team2_games_set2?: number | null
          team2_games_set3?: number | null
          team2_sets?: number | null
          total_sets_played?: number | null
          updated_at?: string
          verified_by_admin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_detailed_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sets: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          set_number: number
          team1_games: number
          team2_games: number
          tiebreak_score: string | null
          winner_team_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          set_number: number
          team1_games?: number
          team2_games?: number
          tiebreak_score?: string | null
          winner_team_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          set_number?: number
          team1_games?: number
          team2_games?: number
          tiebreak_score?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sets_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          created_by: string | null
          division_id: string
          id: string
          league_id: string
          match_duration: unknown
          match_number: number | null
          round_number: number | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          team1_id: string
          team1_score: number | null
          team2_id: string
          team2_score: number | null
          updated_at: string | null
          venue: string | null
          winner_team_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          division_id: string
          id?: string
          league_id: string
          match_duration?: unknown
          match_number?: number | null
          round_number?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          team1_id: string
          team1_score?: number | null
          team2_id: string
          team2_score?: number | null
          updated_at?: string | null
          venue?: string | null
          winner_team_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          division_id?: string
          id?: string
          league_id?: string
          match_duration?: unknown
          match_number?: number | null
          round_number?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["match_status"] | null
          team1_id?: string
          team1_score?: number | null
          team2_id?: string
          team2_score?: number | null
          updated_at?: string | null
          venue?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_approved: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_league_registrations: {
        Row: {
          division_id: string | null
          id: string
          league_id: string | null
          registered_at: string
          status: string | null
          team_id: string | null
        }
        Insert: {
          division_id?: string | null
          id?: string
          league_id?: string | null
          registered_at?: string
          status?: string | null
          team_id?: string | null
        }
        Update: {
          division_id?: string | null
          id?: string
          league_id?: string | null
          registered_at?: string
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_league_registrations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_league_registrations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_league_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          player1_id: string
          player2_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          player1_id: string
          player2_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          player1_id?: string
          player2_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_team_stats: {
        Args: { p_league_id: string; p_team_id: string }
        Returns: {
          league_id: string
          matches_played: number
          matches_won: number
          points: number
          team_id: string
        }[]
      }
      delete_division_fixtures: {
        Args: { p_admin_id: string; p_division_id: string; p_league_id: string }
        Returns: {
          matches_deleted: number
          message: string
        }[]
      }
      direct_update_team_stats: {
        Args: { p_league_id: string; p_team_id: string; p_won: boolean }
        Returns: undefined
      }
      generate_round_robin_fixtures: {
        Args: {
          p_created_by: string
          p_division_id: string
          p_league_id: string
        }
        Returns: {
          fixtures_created: number
          message: string
          total_matches: number
        }[]
      }
      get_division_fixture_info: {
        Args: { p_division_id: string; p_league_id: string }
        Returns: {
          approved_teams: number
          can_generate: boolean
          existing_matches: number
          message: string
          potential_matches: number
          registered_teams: number
          team_count: number
        }[]
      }
      get_fresh_leaderboard_data: {
        Args: { p_league_id: string }
        Returns: {
          bonus_points: number
          division_id: string
          division_level: number
          division_name: string
          matches_played: number
          matches_won: number
          player1_name: string
          player2_name: string
          points: number
          team_id: string
          team_name: string
        }[]
      }
      get_leaderboard_data: {
        Args: { p_league_id: string }
        Returns: {
          division_level: number
          division_name: string
          matches_played: number
          matches_won: number
          player1_name: string
          player2_name: string
          points: number
          team_id: string
          team_name: string
        }[]
      }
      get_match_details: {
        Args: { p_match_id: string }
        Returns: {
          match_format: string
          match_id: string
          sets_detail: Json
          team1_name: string
          team1_sets: number
          team2_name: string
          team2_sets: number
          total_sets: number
          winner_name: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      log_debug: {
        Args: { p_data?: Json; p_function_name: string; p_message: string }
        Returns: undefined
      }
      log_debug_info: {
        Args: { p_data?: Json; p_message: string; p_source: string }
        Returns: undefined
      }
      log_match_result: {
        Args: {
          p_logged_by_team_id: string
          p_match_duration?: number
          p_match_id: string
          p_sets: Json
        }
        Returns: {
          message: string
          success: boolean
          winner_team_id: string
        }[]
      }
      manually_update_match_stats: {
        Args: { p_match_id: string }
        Returns: string
      }
      manually_update_team_stats_for_match: {
        Args: { p_match_id: string }
        Returns: boolean
      }
      update_team_stats: {
        Args: { p_league_id: string; p_team_id: string; p_won: boolean }
        Returns: undefined
      }
      update_team_stats_for_match: {
        Args: {
          p_league_id: string
          p_match_id: string
          p_team1_id: string
          p_team1_score: number
          p_team2_id: string
          p_team2_score: number
        }
        Returns: boolean
      }
      update_team_stats_secure:
        | {
            Args: {
              p_league_id: string
              p_matches_played: number
              p_matches_won: number
              p_points: number
              p_team_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_bonus_points?: number
              p_league_id: string
              p_matches_played: number
              p_matches_won: number
              p_points: number
              p_team_id: string
            }
            Returns: boolean
          }
        | {
            Args: { p_league_id: string; p_team_id: string; p_won: boolean }
            Returns: {
              matches_played: number
              matches_won: number
              points: number
              team_id: string
            }[]
          }
      update_team_stats_with_bonus: {
        Args: {
          p_bonus_points: number
          p_league_id: string
          p_matches_played: number
          p_matches_won: number
          p_points: number
          p_team_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      league_status: "draft" | "registration_open" | "active" | "completed"
      match_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "pending"
        | "postponed"
      user_role: "super_admin" | "league_admin" | "player"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      league_status: ["draft", "registration_open", "active", "completed"],
      match_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "pending",
        "postponed",
      ],
      user_role: ["super_admin", "league_admin", "player"],
    },
  },
} as const
