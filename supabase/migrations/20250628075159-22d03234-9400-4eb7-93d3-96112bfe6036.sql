
-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'league_admin', 'player');

-- Create enum for league status
CREATE TYPE public.league_status AS ENUM ('draft', 'registration_open', 'active', 'completed');

-- Create enum for match status
CREATE TYPE public.match_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  role user_role NOT NULL DEFAULT 'player',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create leagues table
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  match_format TEXT DEFAULT '3 sets',
  status league_status DEFAULT 'draft',
  max_teams_per_division INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create divisions table
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- A, B, C, D, etc.
  level INTEGER NOT NULL, -- 1=A, 2=B, 3=C, etc.
  max_teams INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Create league registrations table (teams in leagues/divisions)
CREATE TABLE public.league_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  points INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(league_id, team_id), -- Team can only be in one division per league
  UNIQUE(division_id, team_id)
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE NOT NULL,
  team1_id UUID REFERENCES public.teams(id) NOT NULL,
  team2_id UUID REFERENCES public.teams(id) NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  status match_status DEFAULT 'scheduled',
  team1_score INTEGER,
  team2_score INTEGER,
  winner_team_id UUID REFERENCES public.teams(id),
  match_duration INTERVAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT different_teams CHECK (team1_id != team2_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Leagues policies
CREATE POLICY "Everyone can view leagues" ON public.leagues
  FOR SELECT USING (true);

CREATE POLICY "League admins can create leagues" ON public.leagues
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('league_admin', 'super_admin') AND
    auth.uid() = created_by
  );

CREATE POLICY "League creators and super admins can update leagues" ON public.leagues
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    public.get_user_role(auth.uid()) = 'super_admin'
  );

-- Divisions policies
CREATE POLICY "Everyone can view divisions" ON public.divisions
  FOR SELECT USING (true);

CREATE POLICY "League creators can manage divisions" ON public.divisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leagues 
      WHERE id = league_id AND 
      (created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'super_admin')
    )
  );

-- Teams policies
CREATE POLICY "Everyone can view teams" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "Players can create teams" ON public.teams
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    (auth.uid() = player1_id OR auth.uid() = player2_id)
  );

CREATE POLICY "Team members can update teams" ON public.teams
  FOR UPDATE USING (
    auth.uid() IN (player1_id, player2_id) OR
    public.get_user_role(auth.uid()) = 'super_admin'
  );

-- League registrations policies
CREATE POLICY "Everyone can view registrations" ON public.league_registrations
  FOR SELECT USING (true);

CREATE POLICY "Team members can register teams" ON public.league_registrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND 
      auth.uid() IN (player1_id, player2_id)
    )
  );

-- Matches policies
CREATE POLICY "Everyone can view matches" ON public.matches
  FOR SELECT USING (true);

CREATE POLICY "League creators can manage matches" ON public.matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leagues 
      WHERE id = league_id AND 
      (created_by = auth.uid() OR public.get_user_role(auth.uid()) = 'super_admin')
    )
  );

-- Create trigger function to update profiles when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, country, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'fullName', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for timestamp management
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at 
  BEFORE UPDATE ON public.leagues 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at 
  BEFORE UPDATE ON public.matches 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
