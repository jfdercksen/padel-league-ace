-- Test function to check if the issue is with the function or with RLS
CREATE OR REPLACE FUNCTION test_update_team_stats(
  p_team_id UUID,
  p_league_id UUID,
  p_won BOOLEAN
)
RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Attempting to update stats for team % in league %', p_team_id, p_league_id;
  
  -- Try to update directly
  BEGIN
    UPDATE league_registrations
    SET 
      matches_played = matches_played + 1,
      matches_won = CASE WHEN p_won THEN matches_won + 1 ELSE matches_won END,
      points = CASE WHEN p_won THEN points + 3 ELSE points + 1 END
    WHERE 
      team_id = p_team_id AND league_id = p_league_id;
      
    GET DIAGNOSTICS v_result = ROW_COUNT;
    
    IF v_result::int > 0 THEN
      RETURN 'SUCCESS: Updated ' || v_result || ' rows';
    ELSE
      RETURN 'FAILURE: No rows updated';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;