-- Direct query to check the current team statistics
SELECT 
  lr.team_id,
  t.name AS team_name,
  lr.points,
  lr.matches_played,
  lr.matches_won
FROM 
  league_registrations lr
  JOIN teams t ON lr.team_id = t.id
WHERE 
  lr.league_id = '05d6addd-9c88-4795-99a8-755bd259920c'
ORDER BY 
  lr.points DESC,
  lr.matches_won DESC;