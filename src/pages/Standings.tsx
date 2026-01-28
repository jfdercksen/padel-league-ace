import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Trophy, 
  Users, 
  Calendar,
  RefreshCw,
  Star,
  Clock,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Leaderboard from '@/components/Leaderboard';

interface League {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

interface Match {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  venue: string | null;
  status: string;
  team1_score: number | null;
  team2_score: number | null;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  division: { name: string };
}

const Standings = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('standings');

  // Get league ID from URL params
  useEffect(() => {
    const leagueIdFromUrl = searchParams.get('leagueId');
    if (leagueIdFromUrl) {
      setSelectedLeague(leagueIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile?.id) {
      fetchLeagues();
      fetchUserTeams();
    }
  if (!profile) {
    setLoading(false);
  }
  }, [profile?.id]);

  useEffect(() => {
    if (selectedLeague) {
      fetchMatches();
    }
  }, [selectedLeague]);

  // Listen for score recording events
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🏆 STANDINGS: Refresh event received');
      handleManualRefresh();
    };

    window.addEventListener('scoreRecorded', handleRefresh);
    window.addEventListener('leaderboardRefresh', handleRefresh);
    
    return () => {
      window.removeEventListener('scoreRecorded', handleRefresh);
      window.removeEventListener('leaderboardRefresh', handleRefresh);
    };
  }, [selectedLeague]);

  const fetchUserTeams = async () => {
    if (!profile?.id) return;
    
    const { data, error } = await supabase
      .from('teams')
      .select('id')
      .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`);

    if (error) {
      console.error('Error fetching user teams:', error);
      return;
    }
    
    setUserTeamIds(data?.map(team => team.id) || []);
  };

  const fetchLeagues = async () => {
    if (!profile) return;

    try {
      let leagueData: League[] = [];

      if (profile.role === 'league_admin' || profile.role === 'super_admin') {
        const { data, error } = await supabase
          .from('leagues')
          .select('id, name, description, start_date, end_date, status')
          .order('created_at', { ascending: false });

        if (error) throw error;
        leagueData = data || [];
      } else {
        // Players see leagues their teams are in
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id')
          .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`);

        if (teamsError) throw teamsError;

        const teamIds = teamsData?.map(team => team.id) || [];

        if (teamIds.length > 0) {
          const { data: registrations, error: regError } = await supabase
            .from('league_registrations')
            .select('league_id')
            .in('team_id', teamIds);

          if (regError) throw regError;

          const leagueIds = [...new Set(registrations?.map(r => r.league_id) || [])];

          if (leagueIds.length > 0) {
            const { data, error } = await supabase
              .from('leagues')
              .select('id, name, description, start_date, end_date, status')
              .in('id', leagueIds)
              .order('created_at', { ascending: false });

            if (error) throw error;
            leagueData = data || [];
          }
        }
      }

      setLeagues(leagueData);

      // Auto-select first league if none selected
      if (leagueData.length > 0 && !selectedLeague) {
        setSelectedLeague(leagueData[0].id);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    if (!selectedLeague) return;

    try {
      const { data } = await supabase
        .from('matches')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          venue,
          status,
          team1_score,
          team2_score,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name),
          division:divisions(name)
        `)
        .eq('league_id', selectedLeague)
        .in('status', ['confirmed', 'completed'])
        .order('scheduled_date', { ascending: false })
        .limit(20);

      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchLeagues();
    await fetchMatches();
    // Dispatch event for Leaderboard component
    window.dispatchEvent(new Event('leaderboardRefresh'));
    setTimeout(() => setRefreshing(false), 500);
  };

  const selectedLeagueData = leagues.find(league => league.id === selectedLeague);
  const upcomingMatches = matches.filter(m => m.status === 'confirmed');
  const completedMatches = matches.filter(m => m.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold">Please sign in</h2>
          <p className="text-muted-foreground text-sm">You need an account to view standings.</p>
          <Link to="/">
            <Button size="sm">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Standings
          </h1>
          <p className="text-sm text-muted-foreground">
            League rankings & results
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* League Selector */}
      {leagues.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <SelectValue placeholder="Select a league" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {leagues.map((league) => (
                  <SelectItem key={league.id} value={league.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{league.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {league.status === 'active' ? '🟢 Active' : 
                         league.status === 'upcoming' ? '🟡 Upcoming' : '⚫ Ended'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* No Leagues State */}
      {leagues.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Leagues Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {profile?.role === 'player'
                ? "Join a team in a league to see standings"
                : "Create a league to get started"
              }
            </p>
            <Link to="/leagues">
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Browse Leagues
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {selectedLeague && selectedLeagueData && (
        <>
          {/* League Info Badge */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(selectedLeagueData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedLeagueData.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                selectedLeagueData.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                selectedLeagueData.status === 'upcoming' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-gray-50 text-gray-700'
              }`}
            >
              {selectedLeagueData.status === 'active' ? 'Active' :
               selectedLeagueData.status === 'upcoming' ? 'Upcoming' : 'Completed'}
            </Badge>
            {(profile?.role === 'super_admin' || profile?.role === 'league_admin') && (
              <Link to={`/leagues/${selectedLeague}/manage`}>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
                  ⚙️ Manage
                </Badge>
              </Link>
            )}
          </div>

          {/* Tabs for Standings / Upcoming / Results */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standings" className="text-xs sm:text-sm">
                <Trophy className="w-4 h-4 mr-1 hidden sm:inline" />
                Standings
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                <Calendar className="w-4 h-4 mr-1 hidden sm:inline" />
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="results" className="text-xs sm:text-sm">
                <Star className="w-4 h-4 mr-1 hidden sm:inline" />
                Results
              </TabsTrigger>
            </TabsList>

            {/* Standings Tab */}
            <TabsContent value="standings" className="mt-4">
              <Leaderboard
                leagueId={selectedLeague}
                showDivisionFilter={true}
              />
            </TabsContent>

            {/* Upcoming Matches Tab */}
            <TabsContent value="upcoming" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {upcomingMatches.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No upcoming matches</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingMatches.map((match) => {
                        const isMyMatch = userTeamIds.includes(match.team1.id) || userTeamIds.includes(match.team2.id);
                        
                        return (
                          <div 
                            key={match.id}
                            className={`p-3 rounded-lg border ${
                              isMyMatch ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                {match.division.name}
                              </Badge>
                              {isMyMatch && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Your Match
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <p className={`font-medium text-sm ${
                                userTeamIds.includes(match.team1.id) ? 'text-green-700' : ''
                              }`}>
                                {match.team1.name}
                              </p>
                              <p className="text-xs text-muted-foreground">vs</p>
                              <p className={`font-medium text-sm ${
                                userTeamIds.includes(match.team2.id) ? 'text-green-700' : ''
                              }`}>
                                {match.team2.name}
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
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
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {completedMatches.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Star className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No completed matches yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedMatches.map((match) => {
                        const isMyMatch = userTeamIds.includes(match.team1.id) || userTeamIds.includes(match.team2.id);
                        const team1Won = (match.team1_score || 0) > (match.team2_score || 0);
                        const team2Won = (match.team2_score || 0) > (match.team1_score || 0);
                        
                        return (
                          <div 
                            key={match.id}
                            className={`p-3 rounded-lg border ${
                              isMyMatch ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                {match.division.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(match.scheduled_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm flex-1 truncate ${
                                  team1Won ? 'font-semibold' : ''
                                } ${userTeamIds.includes(match.team1.id) ? 'text-green-700' : ''}`}>
                                  {match.team1.name}
                                  {team1Won && ' 🏆'}
                                </span>
                                <span className={`text-lg font-bold ml-2 ${
                                  team1Won ? 'text-green-600' : 'text-muted-foreground'
                                }`}>
                                  {match.team1_score ?? '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`text-sm flex-1 truncate ${
                                  team2Won ? 'font-semibold' : ''
                                } ${userTeamIds.includes(match.team2.id) ? 'text-green-700' : ''}`}>
                                  {match.team2.name}
                                  {team2Won && ' 🏆'}
                                </span>
                                <span className={`text-lg font-bold ml-2 ${
                                  team2Won ? 'text-green-600' : 'text-muted-foreground'
                                }`}>
                                  {match.team2_score ?? '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Standings;

