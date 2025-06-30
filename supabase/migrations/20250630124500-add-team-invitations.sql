-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for team invitations
CREATE POLICY "Users can view invitations sent to their email" ON public.team_invitations
  FOR SELECT USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team creators can view their team invitations" ON public.team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Team creators can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update invitations sent to their email" ON public.team_invitations
  FOR UPDATE USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Add update trigger for timestamp management
CREATE TRIGGER update_team_invitations_updated_at 
  BEFORE UPDATE ON public.team_invitations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
