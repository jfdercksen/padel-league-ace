-- Fix the leaderboard function to include bonus_points
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