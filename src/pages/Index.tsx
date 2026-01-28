import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Calendar, 
  Users, 
  ChevronRight,
  Clock,
  MapPin,
  TrendingUp,
  Star,
  AlertCircle,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User
} from 'lucide-react';

interface Standing {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  division_name: string;
  league_name: string;
}

interface UpcomingMatch {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  venue: string | null;
  team1: { name: string };
  team2: { name: string };
  league: { name: string };
  division: { name: string };
}

interface PendingCount {
  confirmations: number;
  matches: number;
}

function AuthUI() {
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Auth state change handled by useAuth hook
    } catch (error: any) {
      setAuthError(error.message || 'Failed to sign in');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      setAuthMessage('Check your email to confirm your account!');
      setAuthTab('signin');
    } catch (error: any) {
      setAuthError(error.message || 'Failed to sign up');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Padel League</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your padel leagues and matches
          </p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardContent className="pt-6">
            {authMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {authMessage}
              </div>
            )}

            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {authError}
              </div>
            )}

            <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'signin' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Sign In Form */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <LogIn className="w-4 h-4 mr-2" />
                    )}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Form */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 characters
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}

export default function Index() {
  const { profile } = useAuth();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [pendingCounts, setPendingCounts] = useState<PendingCount>({ confirmations: 0, matches: 0 });
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
    } else {
      // If no profile (logged out), stop showing the loader
      setLoading(false);
    }
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    const supabaseAny = supabase as any;
    
    try {
      // Get user's teams
      const { data: teamMembers } = await supabaseAny
        .from('team_members')
        .select('team_id')
        .eq('user_id', profile.id);
      
      const teamIds = teamMembers?.map(tm => tm.team_id) || [];
      setUserTeamIds(teamIds);

      // Get standings for user's divisions
      if (teamIds.length > 0) {
        const { data: teams } = await supabaseAny
          .from('teams')
          .select('division_id')
          .in('id', teamIds);
        
        const divisionIds = [...new Set(teams?.map(t => t.division_id).filter(Boolean))];
        
        if (divisionIds.length > 0) {
          const { data: standingsData } = await supabaseAny
            .from('standings')
            .select(`
              team_id,
              played,
              won,
              lost,
              points,
              team:teams(name, division:divisions(name, league:leagues(name)))
            `)
            .in('team:teams.division_id', divisionIds)
            .order('points', { ascending: false })
            .limit(10);

          if (standingsData) {
            const formattedStandings = standingsData.map((s: any) => ({
              team_id: s.team_id,
              team_name: s.team?.name || 'Unknown',
              played: s.played,
              won: s.won,
              lost: s.lost,
              points: s.points,
              division_name: s.team?.division?.name || '',
              league_name: s.team?.division?.league?.name || ''
            }));
            setStandings(formattedStandings);
          }
        }
      }

      // Get upcoming matches for user's teams
      if (teamIds.length > 0) {
        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            id,
            scheduled_date,
            scheduled_time,
            venue,
            team1:teams!matches_team1_id_fkey(name),
            team2:teams!matches_team2_id_fkey(name),
            league:leagues(name),
            division:divisions(name)
          `)
          .eq('status', 'confirmed')
          .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .order('scheduled_date', { ascending: true })
          .limit(5);

        setUpcomingMatches(matchesData || []);
      }

      // Get pending confirmations count
      if (teamIds.length > 0) {
        const { count: confirmCount } = await supabase
          .from('match_confirmations')
          .select('*', { count: 'exact', head: true })
          .in('team_id', teamIds)
          .eq('status', 'pending');

        setPendingCounts({
          confirmations: confirmCount || 0,
          matches: 0
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth UI if not logged in
  if (!profile) {
    return <AuthUI />;
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Welcome Header - Compact on mobile */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg">
        <h1 className="text-lg font-bold">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Player'}! 👋
        </h1>
        <p className="text-green-100 text-sm mt-1">
          Ready to play some padel?
        </p>
      </div>

      {/* Action Required Alert */}
      {pendingCounts.confirmations > 0 && (
        <Link to="/matches">
          <Card className="border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-orange-800">Action Required</p>
                    <p className="text-sm text-orange-600">
                      {pendingCounts.confirmations} match{pendingCounts.confirmations !== 1 ? 'es' : ''} need confirmation
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Stats - 2x2 Grid on mobile */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/teams">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{userTeamIds.length}</p>
              <p className="text-xs text-muted-foreground">My Teams</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/matches">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{upcomingMatches.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/leagues">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold">
                {[...new Set(standings.map(s => s.league_name))].length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Leagues</p>
            </CardContent>
          </Card>
        </Link>
        
        <Card className="h-full">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">
              {standings.find(s => userTeamIds.includes(s.team_id))?.points || 0}
            </p>
            <p className="text-xs text-muted-foreground">My Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Matches - Mobile optimized cards */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming Matches
            </CardTitle>
            <Link to="/matches">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                View All
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingMatches.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming matches</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.slice(0, 3).map((match) => (
                <div 
                  key={match.id} 
                  className="p-3 bg-gray-50 rounded-lg space-y-2"
                >
                  {/* Teams */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {match.team1.name}
                      </p>
                      <p className="text-xs text-muted-foreground">vs</p>
                      <p className="font-medium text-sm truncate">
                        {match.team2.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      {match.division.name}
                    </Badge>
                  </div>
                  
                  {/* Date/Time/Venue */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(match.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {match.scheduled_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {match.scheduled_time}
                      </span>
                    )}
                    {match.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.venue}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* League Standings - Mobile optimized */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              League Standings
            </CardTitle>
            <Link to="/standings">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                Full Table
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {standings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No standings available</p>
              <p className="text-xs mt-1">Join a league to see standings</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Compact Header */}
              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium px-2 py-1">
                <div className="col-span-1">#</div>
                <div className="col-span-6">Team</div>
                <div className="col-span-2 text-center">W-L</div>
                <div className="col-span-3 text-right">Pts</div>
              </div>
              
              {/* Standings Rows */}
              {standings.slice(0, 8).map((standing, index) => {
                const isMyTeam = userTeamIds.includes(standing.team_id);
                const position = index + 1;
                
                return (
                  <div 
                    key={standing.team_id}
                    className={`grid grid-cols-12 gap-1 items-center px-2 py-2 rounded-md text-sm ${
                      isMyTeam 
                        ? 'bg-green-50 border border-green-200' 
                        : index % 2 === 0 ? 'bg-gray-50' : ''
                    }`}
                  >
                    {/* Position */}
                    <div className="col-span-1">
                      {position <= 3 ? (
                        <span className={`font-bold ${
                          position === 1 ? 'text-yellow-500' :
                          position === 2 ? 'text-gray-400' :
                          'text-orange-400'
                        }`}>
                          {position === 1 && '🥇'}
                          {position === 2 && '🥈'}
                          {position === 3 && '🥉'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{position}</span>
                      )}
                    </div>
                    
                    {/* Team Name */}
                    <div className="col-span-6 flex items-center gap-1 min-w-0">
                      <span className={`truncate ${isMyTeam ? 'font-semibold text-green-700' : ''}`}>
                        {standing.team_name}
                      </span>
                      {isMyTeam && <Star className="w-3 h-3 text-green-600 shrink-0" />}
                    </div>
                    
                    {/* Win-Loss */}
                    <div className="col-span-2 text-center text-xs">
                      <span className="text-green-600 font-medium">{standing.won}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-red-600 font-medium">{standing.lost}</span>
                    </div>
                    
                    {/* Points */}
                    <div className="col-span-3 text-right">
                      <span className={`font-bold ${isMyTeam ? 'text-green-700' : ''}`}>
                        {standing.points}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {standings.length > 8 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  +{standings.length - 8} more teams
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/teams" className="block">
          <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
            <Users className="w-5 h-5" />
            <span className="text-xs">My Teams</span>
          </Button>
        </Link>
        <Link to="/matches" className="block">
          <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1">
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Matches</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}