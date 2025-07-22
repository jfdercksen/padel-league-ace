-- Add status column to league_registrations table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'league_registrations'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.league_registrations ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END
$$;

-- Update existing registrations to be approved
UPDATE public.league_registrations SET status = 'approved' WHERE status IS NULL;