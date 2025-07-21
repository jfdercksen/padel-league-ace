-- Update the get_leaderboard_data function to include bonus points
CREATE OR REPLACE FUNCTION get_leaderboard_data(league_id_param UUID)
RETURNS TABLE (
  team_id UUID,
  division_id UUID,
  points INTEGER,
  bonus_points INTEGER,
  matches_played INTEGER,
  matches_won INTEGER,
  team_name TEXT,
  player1_name TEXT,
  player2_name TEXT,
  division_name TEXT,
  division_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.team_id,
    lr.division_id,
    lr.points,
    COALESCE(lr.bonus_points, 0) as bonus_points,
    lr.matches_played,
    lr.matches_won,
    t.name as team_name,
    p1.full_name as player1_name,
    p2.full_name as player2_name,
    d.name as division_name,
    d.level as division_level
  FROM 
    league_registrations lr
  JOIN 
    teams t ON lr.team_id = t.id
  JOIN 
    profiles p1 ON t.player1_id = p1.id
  LEFT JOIN 
    profiles p2 ON t.player2_id = p2.id
  JOIN 
    divisions d ON lr.division_id = d.id
  WHERE 
    lr.league_id = league_id_param
  ORDER BY 
    (lr.points + COALESCE(lr.bonus_points, 0)) DESC,
    CASE WHEN lr.matches_played > 0 THEN lr.matches_won::FLOAT / lr.matches_played ELSE 0 END DESC;
END;
$$ LANGUAGE plpgsql;