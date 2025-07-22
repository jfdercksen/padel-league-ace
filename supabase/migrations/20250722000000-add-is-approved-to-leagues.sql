-- Add is_approved column to leagues table
ALTER TABLE public.leagues ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;

-- Update existing leagues to be approved
UPDATE public.leagues SET is_approved = TRUE WHERE created_by IN (SELECT id FROM profiles WHERE role = 'super_admin');
UPDATE public.leagues SET is_approved = TRUE WHERE status = 'active';