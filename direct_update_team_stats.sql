-- Create a function that directly executes SQL to bypass all RLS
CREATE OR REPLACE FUNCTION direct_update_team_stats(
  p_team_id TEXT,
  p_league_id TEXT,
  p_won BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_sql TEXT;
  v_result JSONB;
BEGIN
  -- Construct a dynamic SQL statement to update the stats
  v_sql := format('
    WITH updated AS (
      UPDATE league_registrations
      SET 
        matches_played = matches_played + 1,
        matches_won = CASE WHEN %L THEN matches_won + 1 ELSE matches_won END,
        points = CASE WHEN %L THEN points + 3 ELSE points + 1 END
      WHERE 
        team_id = %L::uuid AND league_id = %L::uuid
      RETURNING team_id, points, matches_played, matches_won
    )
    SELECT json_build_object(
      ''success'', true,
      ''team_id'', team_id,
      ''points'', points,
      ''matches_played'', matches_played,
      ''matches_won'', matches_won
    ) FROM updated;
  ', p_won, p_won, p_team_id, p_league_id);
  
  -- Execute the dynamic SQL
  EXECUTE v_sql INTO v_result;
  
  -- If no rows were updated, return an error
  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No rows updated',
      'team_id', p_team_id,
      'league_id', p_league_id
    );
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'team_id', p_team_id,
    'league_id', p_league_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;