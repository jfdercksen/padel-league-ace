-- Update the update_team_stats_secure function to include bonus points
CREATE OR REPLACE FUNCTION update_team_stats_secure(
  p_team_id UUID,
  p_league_id UUID,
  p_matches_played INTEGER,
  p_matches_won INTEGER,
  p_points INTEGER,
  p_bonus_points INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Update the team stats in the league_registrations table
  UPDATE league_registrations
  SET 
    matches_played = p_matches_played,
    matches_won = p_matches_won,
    points = p_points,
    bonus_points = p_bonus_points
  WHERE 
    team_id = p_team_id 
    AND league_id = p_league_id;
END;
$$ LANGUAGE plpgsql;