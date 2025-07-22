-- Create a secure function to update team stats with bonus points
-- This function will be called whenever a match is completed

CREATE OR REPLACE FUNCTION update_team_stats_for_match(
  p_match_id UUID,
  p_team1_id UUID,
  p_team2_id UUID,
  p_team1_score INTEGER,
  p_team2_score INTEGER,
  p_league_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  team1_bonus_points INTEGER := 0;
  team2_bonus_points INTEGER := 0;
  team1_points INTEGER;
  team2_points INTEGER;
BEGIN
  -- Calculate bonus points for 3-0 wins
  IF p_team1_score = 3 AND p_team2_score = 0 THEN
    team1_bonus_points := 1;
  ELSIF p_team2_score = 3 AND p_team1_score = 0 THEN
    team2_bonus_points := 1;
  END IF;
  
  -- Calculate total points (3 for win, 1 for loss, plus bonus)
  IF p_team1_score > p_team2_score THEN
    team1_points := 3 + team1_bonus_points;
    team2_points := 1 + team2_bonus_points;
  ELSE
    team1_points := 1 + team1_bonus_points;
    team2_points := 3 + team2_bonus_points;
  END IF;
  
  -- Update team1 stats
  UPDATE league_registrations 
  SET 
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN p_team1_score > p_team2_score THEN 1 ELSE 0 END,
    points = points + team1_points,
    bonus_points = bonus_points + team1_bonus_points
  WHERE team_id = p_team1_id AND league_id = p_league_id;
  
  -- Update team2 stats
  UPDATE league_registrations 
  SET 
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN p_team2_score > p_team1_score THEN 1 ELSE 0 END,
    points = points + team2_points,
    bonus_points = bonus_points + team2_bonus_points
  WHERE team_id = p_team2_id AND league_id = p_league_id;
  
  -- Log the update
  RAISE NOTICE 'Updated team stats for match %: Team1 got % points (% bonus), Team2 got % points (% bonus)', 
    p_match_id, team1_points, team1_bonus_points, team2_points, team2_bonus_points;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating team stats: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Test the function with the existing match data
-- (Replace with actual values from your database)
-- SELECT update_team_stats_for_match(
--   'd7ebb394-f81a-494a-a19b-685674c544b7'::UUID,
--   'team1_id_here'::UUID,
--   'team2_id_here'::UUID,
--   3,
--   0,
--   '99badd34-d07c-49da-8a9c-ce171d93f5a0'::UUID
-- );