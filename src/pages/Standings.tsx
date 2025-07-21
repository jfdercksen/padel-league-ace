import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Trophy, Users, ArrowLeft, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Leaderboard from '@/components/Leaderboard'; // Import the component we just created

interface League {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

const Standings = () => {
  const { profile } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchLeagues();

    // Check URL parameters for refresh and leagueId
    const urlParams = new URLSearchParams(window.location.search);
    const refresh = urlParams.get('refresh');
    const leagueId = urlParams.get('leagueId');

    if (refresh && leagueId) {
      console.log('🏆 STANDINGS: Detected navigation with refresh parameter');

      // Auto-select the league from the URL parameter
      setSelectedLeague(leagueId);

      // Force a refresh of the data immediately
      console.log('🔄 STANDINGS: Forcing refresh from URL parameters');
      fetchLeagues(); // Fetch leagues again
      setRefreshTrigger(prev => prev + 1); // Trigger a refresh

      // Force a page reload after a short delay to ensure fresh data
      setTimeout(() => {
        console.log('🔄 STANDINGS: Forcing page reload for fresh data');
        // Remove the refresh parameter to prevent infinite reload
        const newUrl = window.location.pathname + '?leagueId=' + leagueId;
        window.history.replaceState({}, '', newUrl);
        window.location.reload();
      }, 1000);

      return;
    }

    // Check localStorage for lastUpdatedLeagueId
    const lastUpdatedLeagueId = localStorage.getItem('lastUpdatedLeagueId');
    const forceRefreshTimestamp = localStorage.getItem('forceRefreshTimestamp');

    if (lastUpdatedLeagueId) {
      console.log('🏆 STANDINGS: Detected navigation from match result recording');

      // Clear the flags
      localStorage.removeItem('lastUpdatedLeagueId');
      localStorage.removeItem('forceRefreshTimestamp');

      // Auto-select the league from the match result
      setSelectedLeague(lastUpdatedLeagueId);

      // Force a refresh of the data immediately
      console.log('🔄 STANDINGS: Forcing refresh after match result');
      fetchLeagues(); // Fetch leagues again
      setRefreshTrigger(prev => prev + 1); // Trigger a refresh

      // Add a manual refresh button
      const refreshButton = document.createElement('button');
      refreshButton.innerText = 'Refresh Standings';
      refreshButton.className = 'fixed top-4 right-4 bg-amber-500 text-white px-4 py-2 rounded shadow-lg z-50';
      refreshButton.onclick = () => window.location.reload();
      document.body.appendChild(refreshButton);

      // Remove the button after 10 seconds
      setTimeout(() => {
        if (document.body.contains(refreshButton)) {
          document.body.removeChild(refreshButton);
        }
      }, 10000);
    }
  }, [profile, refreshTrigger]);

  // Listen for score recording events to refresh standings
  useEffect(() => {
    const handleScoreRecorded = () => {
      console.log('🏆 STANDINGS: Score recorded event received - triggering refresh...');
      setRefreshTrigger(prev => prev + 1);
    };

    const handleLeaderboardRefresh = () => {
      console.log('🏆 STANDINGS: Leaderboard refresh event received - triggering refresh...');
      setRefreshTrigger(prev => prev + 1);
    };

    const handleGlobalRefresh = () => {
      console.log('🏆 STANDINGS: Global refresh event received - triggering refresh...');
      setRefreshTrigger(prev => prev + 1);
    };

    // Set up all event listeners
    console.log('🔧 STANDINGS: Setting up refresh event listeners');
    window.addEventListener('scoreRecorded', handleScoreRecorded);
    window.addEventListener('leaderboardRefresh', handleLeaderboardRefresh);
    window.addEventListener('globalRefresh', handleGlobalRefresh);

    return () => {
      console.log('🔧 STANDINGS: Removing refresh event listeners');
      window.removeEventListener('scoreRecorded', handleScoreRecorded);
      window.removeEventListener('leaderboardRefresh', handleLeaderboardRefresh);
      window.removeEventListener('globalRefresh', handleGlobalRefresh);
    };
  }, []);

  const fetchLeagues = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let leagueData: League[] = [];

      if (profile.role === 'league_admin' || profile.role === 'super_admin') {
        // Admins can see all leagues
        const { data, error } = await supabase
          .from('leagues')
          .select('id, name, description, start_date, end_date, status')
          .order('created_at', { ascending: false });

        if (error) throw error;
        leagueData = data || [];
      } else {
        // Players can only see leagues their teams are registered for
        const { data: userTeams, error: teamsError } = await supabase
          .from('teams')
          .select('id')
          .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`);

        if (teamsError) throw teamsError;

        const teamIds = userTeams?.map(team => team.id) || [];

        if (teamIds.length > 0) {
          const { data: registrations, error: regError } = await supabase
            .from('league_registrations')
            .select('league_id')
            .in('team_id', teamIds);

          if (regError) throw regError;

          const registeredLeagueIds = registrations?.map(reg => reg.league_id) || [];

          if (registeredLeagueIds.length > 0) {
            const { data, error } = await supabase
              .from('leagues')
              .select('id, name, description, start_date, end_date, status')
              .in('id', registeredLeagueIds)
              .order('created_at', { ascending: false });

            if (error) throw error;
            leagueData = data || [];
          }
        }
      }

      setLeagues(leagueData);

      // Auto-select first league if available
      if (leagueData.length > 0 && !selectedLeague) {
        setSelectedLeague(leagueData[0].id);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedLeagueData = leagues.find(league => league.id === selectedLeague);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading standings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  League Standings
                </h2>
                <Button
                  onClick={() => {
                    console.log('🔄 STANDINGS: Manual refresh triggered');
                    window.location.reload();
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M8 16H3v5"></path>
                  </svg>
                  Refresh Data
                </Button>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                View live rankings and team performance across all leagues
              </p>
            </div>
          </div>

          {/* League Selector */}
          {leagues.length > 1 && (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <label className="text-sm font-medium">Select League:</label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Choose a league" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{league.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(league.start_date).toLocaleDateString()} - {new Date(league.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected League Info */}
          {selectedLeagueData && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedLeagueData.name}</h3>
                    {selectedLeagueData.description && (
                      <p className="text-muted-foreground text-sm mt-1">
                        {selectedLeagueData.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Season: {new Date(selectedLeagueData.start_date).toLocaleDateString()} - {new Date(selectedLeagueData.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium">
                      {selectedLeagueData.status === 'active' ? 'Active Season' :
                        selectedLeagueData.status === 'upcoming' ? 'Upcoming Season' :
                          'Season Ended'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        {leagues.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Leagues Available</h3>
                <p className="text-muted-foreground mb-6">
                  {profile?.role === 'player'
                    ? "You haven't joined any leagues yet. Join a league to see standings!"
                    : "No leagues have been created yet. Create your first league to get started!"
                  }
                </p>
                {profile?.role === 'league_admin' && profile.is_approved && (
                  <Link to="/create-league">
                    <Button>
                      <Trophy className="w-4 h-4 mr-2" />
                      Create League
                    </Button>
                  </Link>
                )}
                {profile?.role === 'player' && (
                  <Link to="/leagues">
                    <Button>
                      <Users className="w-4 h-4 mr-2" />
                      Browse Leagues
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : selectedLeague ? (
          <div className="space-y-6">
            {/* Main Leaderboard */}
            <Leaderboard
              leagueId={selectedLeague}
              showDivisionFilter={true}
            />

            {/* Additional Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Leaderboard
                    leagueId={selectedLeague}
                    showDivisionFilter={false}
                    maxEntries={3}
                    compact={true}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="w-4 h-4" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/matches" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      View Matches
                    </Button>
                  </Link>
                  <Link to="/teams" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      My Teams
                    </Button>
                  </Link>
                  {(profile?.role === 'league_admin' || profile?.role === 'super_admin') && (
                    <Link to={`/manage-league/${selectedLeague}`} className="block">
                      <Button variant="outline" className="w-full justify-start bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage League
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" />
                    Season Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{selectedLeagueData?.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started:</span>
                    <span className="font-medium">
                      {selectedLeagueData ? new Date(selectedLeagueData.start_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ends:</span>
                    <span className="font-medium">
                      {selectedLeagueData ? new Date(selectedLeagueData.end_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Select a League</h3>
                <p className="text-muted-foreground">
                  Choose a league from the dropdown above to view its standings.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Standings;