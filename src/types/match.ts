export interface Match {
  id: string;
  league_id: string;
  division_id: string;
  team1_id: string;
  team2_id: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  venue: string | null;
  status: string;
  team1_score: number | null;
  team2_score: number | null;
  winner_team_id: string | null;
  match_duration: unknown | null;
  created_at: string | null;
  updated_at: string | null;
  round_number: number | null;
  match_number: number | null;
  created_by: string | null;
  team1: {           // Required (remove the ?)
    name: string;
  };
  team2: {           // Required (remove the ?)
    name: string;
  };
  division: {       // Keep optional
    name: string;
    level: number;
  };
  league: {         // Keep optional
    name: string;
  };
}