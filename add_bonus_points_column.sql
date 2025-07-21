-- Add bonus_points column to team_stats table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'league_registrations' AND column_name = 'bonus_points') THEN
    ALTER TABLE league_registrations ADD COLUMN bonus_points INTEGER DEFAULT 0;
  END IF;
END
$$;