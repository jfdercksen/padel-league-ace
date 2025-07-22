# Fix Bonus Points in Leaderboard

## Problem
The bonus points are being recorded when scores are submitted, but they're not showing up in the leaderboard because the database function `get_fresh_leaderboard_data` doesn't include the `bonus_points` column.

## Solution
You need to apply the SQL migration to update the database function.

## Steps to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://jvmuwpcmurtomevutjyy.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250723000002-fix-leaderboard-function-bonus-points.sql`
4. Run the SQL query

### Option 2: Using Supabase CLI (if available)
```bash
supabase db push
```

## What the Fix Does
1. Updates the `get_fresh_leaderboard_data` function to include `bonus_points` column
2. Adds proper sorting by total points (regular points + bonus points)
3. Updates the frontend components to properly handle and display bonus points

## Files Changed
- `src/components/Leaderboard.tsx` - Updated to handle bonus points from database
- `src/components/ScoreRecordingModal.tsx` - Updated to include bonus points in localStorage
- `supabase/migrations/20250723000002-fix-leaderboard-function-bonus-points.sql` - Database function fix

## Testing
After applying the migration:
1. Record a match score with a 3-0 result (which awards bonus points)
2. Check the leaderboard - bonus points should now be visible
3. The total points should include both regular points and bonus points
4. Teams should be sorted by total points (regular + bonus)

## SQL to Apply
```sql
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
```