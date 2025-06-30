-- Add status field to league_registrations table for approval workflow
ALTER TABLE public.league_registrations 
ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing registrations to have 'approved' status (assuming they were auto-approved before)
UPDATE public.league_registrations SET status = 'approved' WHERE status IS NULL;
