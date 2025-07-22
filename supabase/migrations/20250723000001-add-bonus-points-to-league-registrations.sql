-- Add bonus_points column to league_registrations table
ALTER TABLE public.league_registrations ADD COLUMN bonus_points INTEGER DEFAULT 0;

-- Update existing registrations to have 0 bonus points
UPDATE public.league_registrations SET bonus_points = 0 WHERE bonus_points IS NULL;