-- Fix the team stats to show correct points for the 3-0 match
-- The winning team should have exactly 4 points (3 for win + 1 bonus)
-- The losing team should have exactly 1 point

-- First, let's see the current state
SELECT 
  t.name as team_name,
  lr.points,
  lr.bonus_points,
  lr.matches_played,
  lr.matches_won,
  (lr.points + lr.bonus_points) as total_points
FROM league_registrations lr
JOIN teams t ON lr.team_id = t.id
WHERE lr.league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0'
ORDER BY (lr.points + lr.bonus_points) DESC;

-- Reset and set correct values for the winning team (3-0 winner)
UPDATE league_registrations 
SET 
  matches_played = 1,
  matches_won = 1,
  points = 3,  -- 3 points for the win
  bonus_points = 1  -- 1 bonus point for 3-0 clean sweep
WHERE team_id = (
  SELECT team1_id FROM matches 
  WHERE league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0' 
    AND team1_score = 3 
    AND team2_score = 0 
    AND status = 'completed'
  LIMIT 1
)
AND league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0';

-- Reset and set correct values for the losing team (0-3 loser)
UPDATE league_registrations 
SET 
  matches_played = 1,
  matches_won = 0,
  points = 1,  -- 1 point for participation
  bonus_points = 0  -- No bonus points
WHERE team_id = (
  SELECT team2_id FROM matches 
  WHERE league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0' 
    AND team1_score = 3 
    AND team2_score = 0 
    AND status = 'completed'
  LIMIT 1
)
AND league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0';

-- Verify the corrected values
SELECT 
  t.name as team_name,
  lr.points as regular_points,
  lr.bonus_points,
  (lr.points + lr.bonus_points) as total_points,
  lr.matches_played,
  lr.matches_won
FROM league_registrations lr
JOIN teams t ON lr.team_id = t.id
WHERE lr.league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0'
ORDER BY (lr.points + lr.bonus_points) DESC;