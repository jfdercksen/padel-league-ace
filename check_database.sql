-- Check current database state to debug bonus points issue

-- 1. Check matches table
SELECT 
  id,
  status,
  team1_score,
  team2_score,
  winner_team_id,
  league_id,
  created_at
FROM matches 
WHERE league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check league_registrations table
SELECT 
  team_id,
  points,
  bonus_points,
  matches_played,
  matches_won,
  league_id
FROM league_registrations 
WHERE league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0';

-- 3. Check teams table
SELECT 
  t.id,
  t.name,
  p1.full_name as player1_name,
  p2.full_name as player2_name
FROM teams t
JOIN profiles p1 ON t.player1_id = p1.id
LEFT JOIN profiles p2 ON t.player2_id = p2.id
WHERE t.id IN (
  SELECT team_id FROM league_registrations 
  WHERE league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0'
);

-- 4. Test the leaderboard function
SELECT * FROM get_fresh_leaderboard_data('99badd34-d07c-49da-8a9c-ce171d93f5a0');