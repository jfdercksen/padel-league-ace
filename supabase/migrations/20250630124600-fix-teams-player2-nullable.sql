-- Make player2_id nullable in teams table to support incomplete teams
ALTER TABLE public.teams ALTER COLUMN player2_id DROP NOT NULL;
