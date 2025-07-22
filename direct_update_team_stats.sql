-- Direct update to fix the existing 3-0 match that didn't update team stats
-- Run this in your Supabase SQL Editor

-- First, let's see what we have
SELECT 
  m.id as match_id,
  m.team1_score,
  m.team2_score,
  m.winner_team_id,
  t1.name as team1_name,
  t2.name as team2_name,
  lr1.points as team1_current_points,
  lr1.bonus_points as team1_current_bonus,
  lr1.matches_played as team1_matches_played,
  lr2.points as team2_current_points,
  lr2.bonus_points as team2_current_bonus,
  lr2.matches_played as team2_matches_played
FROM matches m
JOIN teams t1 ON m.team1_id = t1.id
JOIN teams t2 ON m.team2_id = t2.id
JOIN league_registrations lr1 ON m.team1_id = lr1.team_id AND m.league_id = lr1.league_id
JOIN league_registrations lr2 ON m.team2_id = lr2.team_id AND m.league_id = lr2.league_id
WHERE m.league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0'
  AND m.status = 'completed'
ORDER BY m.created_at DESC;

-- Now let's update the team stats for the 3-0 match
-- This assumes the match with team1_score=3, team2_score=0 exists

-- Update the winning team (team1 with 3-0 win gets 3 points + 1 bonus point)
UPDATE league_registrations 
SET 
  matches_played = matches_played + 1,
  matches_won = matches_won + 1,
  points = points + 4,  -- 3 for win + 1 bonus
  bonus_points = bonus_points + 1
WHERE team_id = (
  SELECT team1_id FROM matches 
  WHERE league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0' 
    AND team1_score = 3 
    AND team2_score = 0 
    AND status = 'completed'
  LIMIT 1
)
AND league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0';

-- Update the losing team (team2 with 0-3 loss gets 1 point)
UPDATE league_registrations 
SET 
  matches_played = matches_played + 1,
  matches_won = matches_won + 0,
  points = points + 1,  -- 1 for participation
  bonus_points = bonus_points + 0
WHERE team_id = (
  SELECT team2_id FROM matches 
  WHERE league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0' 
    AND team1_score = 3 
    AND team2_score = 0 
    AND status = 'completed'
  LIMIT 1
)
AND league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0';

-- Verify the updates
SELECT 
  t.name as team_name,
  lr.points,
  lr.bonus_points,
  lr.matches_played,
  lr.matches_won
FROM league_registrations lr
JOIN teams t ON lr.team_id = t.id
WHERE lr.league_id = '99badd34-d07c-49da-8a9c-ce171d93f5a0'
ORDER BY (lr.points + lr.bonus_points) DESC;