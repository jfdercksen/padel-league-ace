-- Drop the function if it exists to ensure a clean slate
DROP FUNCTION IF EXISTS update_team_stats_secure(UUID, UUID, INTEGER, INTEGER, INTEGER);

-- Create a secure function that can be called by any authenticated user
-- This bypasses row-level security and allows players to update team stats
CREATE OR REPLACE FUNCTION update_team_stats_secure(
  p_team_id UUID,
  p_league_id UUID,
  p_matches_played INTEGER,
  p_matches_won INTEGER,
  p_points INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the stats directly with the provided values
  UPDATE league_registrations
  SET 
    matches_played = p_matches_played,
    matches_won = p_matches_won,
    points = p_points
  WHERE 
    team_id = p_team_id AND league_id = p_league_id;
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_team_stats_secure(UUID, UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Test the function
-- SELECT update_team_stats_secure('your-team-id'::uuid, 'your-league-id'::uuid, 1, 1, 3);