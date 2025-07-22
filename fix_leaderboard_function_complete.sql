-- Complete fix for bonus points in leaderboard
-- Run this in your Supabase SQL Editor

-- 1. First, add the bonus_points column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'league_registrations' 
                   AND column_name = 'bonus_points') THEN
        ALTER TABLE public.league_registrations ADD COLUMN bonus_points INTEGER DEFAULT 0;
        UPDATE public.league_registrations SET bonus_points = 0 WHERE bonus_points IS NULL;
    END IF;
END $$;

-- 2. Drop the existing function first (as suggested by the error)
DROP FUNCTION IF EXISTS get_fresh_leaderboard_data(uuid);

-- 3. Create the new function with bonus_points included
CREATE OR REPLACE FUNCTION get_fresh_leaderboard_data(p_league_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  points INTEGER,
  bonus_points INTEGER,
  matches_played INTEGER,
  matches_won INTEGER,
  player1_name TEXT,
  player2_name TEXT,
  division_id UUID,
  division_name TEXT,
  division_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.team_id,
    t.name AS team_name,
    lr.points,
    COALESCE(lr.bonus_points, 0) AS bonus_points,
    lr.matches_played,
    lr.matches_won,
    p1.full_name AS player1_name,
    COALESCE(p2.full_name, 'N/A') AS player2_name,
    lr.division_id,
    d.name AS division_name,
    d.level AS division_level
  FROM 
    league_registrations lr
    JOIN teams t ON lr.team_id = t.id
    JOIN profiles p1 ON t.player1_id = p1.id
    LEFT JOIN profiles p2 ON t.player2_id = p2.id
    JOIN divisions d ON lr.division_id = d.id
  WHERE 
    lr.league_id = p_league_id
  ORDER BY 
    (lr.points + COALESCE(lr.bonus_points, 0)) DESC,
    lr.matches_won DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'league_registrations' 
  AND column_name IN ('points', 'bonus_points')
ORDER BY column_name;

-- 5. Test the function with a sample league ID (replace with your actual league ID)
-- SELECT * FROM get_fresh_leaderboard_data('99badd34-d07c-49da-8a9c-ce171d93f5a0') LIMIT 3;