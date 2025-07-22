import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, TrendingUp, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  team_id: string;
  division_id: string;
  points: number;
  bonus_points?: number;
  matches_played: number;
  matches_won: number;
  team: {
    id: string;
    name: string;
    player1: {
      full_name: string;
    };
    player2: {
      full_name: string;
    };
  };
  division: {
    name: string;
    level: number;
  };
  // Calculated fields
  matches_lost: number;
  win_percentage: number;
  points_per_match: number;
  total_points?: number; // Combined regular + bonus points
}

interface Division {
  id: string;
  name: string;
  level: number;
}

interface LeaderboardProps {
  leagueId: string;
  showDivisionFilter?: boolean;
  maxEntries?: number;
  compact?: boolean;
}

const Leaderboard = ({
  leagueId,
  showDivisionFilter = true,
  maxEntries,
  compact = false
}: LeaderboardProps) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Create a global refresh function that can be called from anywhere
  useEffect(() => {
    // Define the refresh function
    const refreshLeaderboard = () => {
      console.log('🔄 GLOBAL: refreshAllLeaderboards function called');
      setRefreshTrigger(prev => prev + 1);
    };

    // Attach it to the window object so it can be called from anywhere
    (window as any).refreshAllLeaderboards = refreshLeaderboard;

    return () => {
      // Clean up when component unmounts
      delete (window as any).refreshAllLeaderboards;
    };
  }, []);

  // Set up multiple event listeners for different refresh events
  useEffect(() => {
    const handleScoreRecorded = () => {
      console.log('🎾 LEADERBOARD: Score recorded event received - triggering refresh...');

      // Check for updated team stats in localStorage
      const updatedTeamStats = localStorage.getItem('updatedTeamStats');
      if (updatedTeamStats) {
        try {
          const stats = JSON.parse(updatedTeamStats);
          const relevantStats = stats.filter((s: any) => s.leagueId === leagueId);

          if (relevantStats.length > 0) {
            console.log('🎾 LEADERBOARD: Found updated team stats in localStorage:', relevantStats);

            // Update the leaderboard data with these stats immediately
            setLeaderboardData(prev => {
              if (!prev || prev.length === 0) return prev;

              const updated = [...prev];
              let dataChanged = false;

              updated.forEach(entry => {
                const matchingStat = relevantStats.find((s: any) => s.teamId === entry.team_id);
                if (matchingStat) {
                  console.log(`🎾 LEADERBOARD: Updating team ${entry.team.name} with stats:`, matchingStat);
                  entry.points = matchingStat.points;
                  entry.bonus_points = matchingStat.bonus_points || 0;
                  entry.total_points = (matchingStat.points || 0) + (matchingStat.bonus_points || 0);
                  entry.matches_played = matchingStat.matches_played;
                  entry.matches_won = matchingStat.matches_won;
                  entry.matches_lost = matchingStat.matches_played - matchingStat.matches_won;
                  entry.win_percentage = matchingStat.matches_played > 0
                    ? (matchingStat.matches_won / matchingStat.matches_played) * 100
                    : 0;
                  dataChanged = true;
                }
              });

              if (dataChanged) {
                // Re-sort the data by total points (including bonus points)
                updated.sort((a, b) => {
                  const aTotalPoints = (a.points || 0) + (a.bonus_points || 0);
                  const bTotalPoints = (b.points || 0) + (b.bonus_points || 0);
                  if (bTotalPoints !== aTotalPoints) return bTotalPoints - aTotalPoints;
                  if (b.win_percentage !== a.win_percentage) return b.win_percentage - a.win_percentage;
                  return b.matches_won - a.matches_won;
                });

                console.log('🎾 LEADERBOARD: Data updated and re-sorted with localStorage stats');
              }

              return updated;
            });

            // Clear the localStorage after use
            localStorage.removeItem('updatedTeamStats');
          }
        } catch (e) {
          console.error('Error parsing updatedTeamStats from localStorage:', e);
        }
      }

      // Still trigger a refresh to ensure we get the latest data
      setRefreshTrigger(prev => prev + 1);
    };

    const handleLeaderboardRefresh = (e: any) => {
      console.log('🎾 LEADERBOARD: Leaderboard refresh event received with data:', e.detail);
      setRefreshTrigger(prev => prev + 1);
    };

    const handleGlobalRefresh = (e: any) => {
      console.log('🎾 LEADERBOARD: Global refresh event received with counter:', e.detail?.counter);
      setRefreshTrigger(prev => prev + 1);
    };

    // Check localStorage for recent updates
    const checkLocalStorage = () => {
      const lastUpdate = localStorage.getItem('lastMatchUpdate');
      const lastLeague = localStorage.getItem('lastMatchLeague');

      if (lastUpdate && lastLeague === leagueId) {
        console.log('🎾 LEADERBOARD: Found recent update in localStorage, refreshing...');
        setRefreshTrigger(prev => prev + 1);
        // Clear to prevent duplicate refreshes
        localStorage.removeItem('lastMatchUpdate');
      }

      // Also check for updated team stats
      handleScoreRecorded();
    };

    // Run once on mount
    checkLocalStorage();

    // Set up all event listeners
    console.log('🔧 LEADERBOARD: Setting up multiple refresh event listeners');
    window.addEventListener('scoreRecorded', handleScoreRecorded);
    window.addEventListener('leaderboardRefresh', handleLeaderboardRefresh);
    window.addEventListener('globalRefresh', handleGlobalRefresh);

    return () => {
      console.log('🔧 LEADERBOARD: Removing all refresh event listeners');
      window.removeEventListener('scoreRecorded', handleScoreRecorded);
      window.removeEventListener('leaderboardRefresh', handleLeaderboardRefresh);
      window.removeEventListener('globalRefresh', handleGlobalRefresh);
    };
  }, [leagueId]); // Re-run when leagueId changes

  // Fetch data when dependencies change
  useEffect(() => {
    console.log('🔄 LEADERBOARD: Fetching data with refreshTrigger:', refreshTrigger);
    console.log('🔄 LEADERBOARD: Selected division:', selectedDivision);
    fetchLeaderboardData();
    if (showDivisionFilter) {
      fetchDivisions();
    }
  }, [leagueId, selectedDivision, refreshTrigger]);

  const fetchDivisions = async () => {
    try {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name, level')
        .eq('league_id', leagueId)
        .order('level');

      if (error) throw error;
      setDivisions(data || []);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchLeaderboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 LEADERBOARD: Fetching data for league:', leagueId);

      // Try multiple approaches to get the most up-to-date data
      console.log('🔄 LEADERBOARD: Attempting multiple data fetch approaches');

      // First try direct SQL query approach (most reliable)
      try {
        console.log('🔄 LEADERBOARD: Using direct SQL query approach');

        // This is a direct query that mimics what the database function would do
        // Now includes bonus_points after successful migration
        let directQuery = supabase
          .from('league_registrations')
          .select(`
            team_id,
            division_id,
            points,
            bonus_points,
            matches_played,
            matches_won,
            teams!inner (
              id,
              name,
              player1:profiles!teams_player1_id_fkey (full_name),
              player2:profiles!teams_player2_id_fkey (full_name)
            ),
            divisions!inner (id, name, level)
          `)
          .eq('league_id', leagueId);
          
        // Filter by division if selected
        if (selectedDivision !== 'all') {
          console.log('🔍 LEADERBOARD: Filtering by division:', selectedDivision);
          directQuery = directQuery.eq('division_id', selectedDivision);
        }
        
        // Add ordering by total points (points + bonus_points)
        directQuery = directQuery
          .order('points', { ascending: false })
          .order('bonus_points', { ascending: false })
          .order('matches_won', { ascending: false });
          
        // Execute the query
        const { data: directQueryData, error: directQueryError } = await directQuery;

        if (!directQueryError && directQueryData && directQueryData.length > 0) {
          console.log(`✅ LEADERBOARD: Fetched ${directQueryData.length} team entries via direct query at ${new Date().toLocaleTimeString()}`);
          console.log('📊 LEADERBOARD: First team data from direct query:', directQueryData[0]);

          // Transform the data to match our expected format
          const processedData = directQueryData.map(entry => ({
            id: `${entry.team_id}-${leagueId}`,
            team_id: entry.team_id,
            division_id: entry.divisions?.id || '',
            points: entry.points || 0,
            bonus_points: entry.bonus_points || 0,
            matches_played: entry.matches_played || 0,
            matches_won: entry.matches_won || 0,
            team: {
              id: entry.team_id,
              name: entry.teams?.name || 'Unknown Team',
              player1: { full_name: entry.teams?.player1?.full_name || 'Unknown Player' },
              player2: { full_name: entry.teams?.player2?.full_name || 'N/A' }
            },
            division: {
              name: entry.divisions?.name || 'Unknown Division',
              level: entry.divisions?.level || 0
            },
            matches_lost: (entry.matches_played || 0) - (entry.matches_won || 0),
            win_percentage: entry.matches_played > 0
              ? ((entry.matches_won || 0) / entry.matches_played) * 100
              : 0,
            points_per_match: entry.matches_played > 0
              ? (entry.points || 0) / entry.matches_played
              : 0,
            total_points: (entry.points || 0) + (entry.bonus_points || 0)
          }));

          // Filter by division if selected (client-side filter)
          let filteredData = processedData;
          if (selectedDivision !== 'all') {
            console.log('🔍 LEADERBOARD: Client-side filtering by division:', selectedDivision);
            filteredData = processedData.filter(entry => entry.division_id === selectedDivision);
            console.log(`🔍 LEADERBOARD: Filtered from ${processedData.length} to ${filteredData.length} teams`);
          }

          // Apply maxEntries limit if specified
          const finalData = maxEntries ? filteredData.slice(0, maxEntries) : filteredData;

          // Force a complete re-render by creating a new array
          setLeaderboardData([...finalData]);
          console.log('✅ LEADERBOARD: Direct query data processed, filtered, and sorted');
          setLoading(false);
          return; // Exit early if direct query method worked
        }
      } catch (directQueryError) {
        console.log('⚠️ LEADERBOARD: Direct query method failed, trying function method', directQueryError);
      }

      // Second, try to use the database function (either name)
      try {
        console.log('🔄 LEADERBOARD: Trying get_fresh_leaderboard_data function');
        const { data: leaderboardData, error: leaderboardError } = await supabase.rpc(
          'get_fresh_leaderboard_data',
          { p_league_id: leagueId }
        );

        if (!leaderboardError && leaderboardData && leaderboardData.length > 0) {
          console.log(`✅ LEADERBOARD: Fetched ${leaderboardData.length} team entries via function at ${new Date().toLocaleTimeString()}`);
          console.log('📊 LEADERBOARD: First team data from function:', leaderboardData[0]);

          // Process the data from the function
          const processedData = leaderboardData.map(entry => ({
            id: `${entry.team_id}-${leagueId}`,
            team_id: entry.team_id,
            division_id: entry.division_id || '', // Make sure we have division_id for filtering
            points: entry.points || 0,
            bonus_points: entry.bonus_points || 0,
            matches_played: entry.matches_played || 0,
            matches_won: entry.matches_won || 0,
            team: {
              id: entry.team_id,
              name: entry.team_name,
              player1: { full_name: entry.player1_name },
              player2: { full_name: entry.player2_name || 'N/A' }
            },
            division: {
              id: entry.division_id || '',
              name: entry.division_name,
              level: entry.division_level
            },
            matches_lost: (entry.matches_played || 0) - (entry.matches_won || 0),
            win_percentage: entry.matches_played > 0
              ? ((entry.matches_won || 0) / entry.matches_played) * 100
              : 0,
            points_per_match: entry.matches_played > 0
              ? (entry.points || 0) / entry.matches_played
              : 0,
            total_points: (entry.points || 0) + (entry.bonus_points || 0)
          }));
          
          // Filter by division if selected (client-side filter)
          let filteredData = processedData;
          if (selectedDivision !== 'all') {
            console.log('🔍 LEADERBOARD: Client-side filtering by division in function data:', selectedDivision);
            filteredData = processedData.filter(entry => entry.division_id === selectedDivision);
            console.log(`🔍 LEADERBOARD: Filtered function data from ${processedData.length} to ${filteredData.length} teams`);
          }

          // Apply maxEntries limit if specified
          const finalData = maxEntries ? filteredData.slice(0, maxEntries) : filteredData;

          // Force a complete re-render by creating a new array
          setLeaderboardData([...finalData]);
          console.log('✅ LEADERBOARD: Function data processed and sorted');
          setLoading(false);
          return; // Exit early if function method worked
        }
      } catch (functionError) {
        console.log('⚠️ LEADERBOARD: Function method failed, falling back to standard query', functionError);
      }

      // FALLBACK: Use a direct query with explicit ordering
      console.log('🔄 LEADERBOARD: Using standard query');

      let query = supabase
        .from('league_registrations')
        .select(`
          id,
          team_id,
          division_id,
          points,
          bonus_points,
          matches_played,
          matches_won,
          team:teams(
            id,
            name,
            player1:profiles!teams_player1_id_fkey(full_name),
            player2:profiles!teams_player2_id_fkey(full_name)
          ),
          division:divisions(name, level)
        `)
        .eq('league_id', leagueId)
        .order('points', { ascending: false }); // Order by points descending

      // Filter by division if selected
      if (selectedDivision !== 'all') {
        query = query.eq('division_id', selectedDivision);
      }

      // Execute the query
      const { data, error } = await query;

      if (error) throw error;

      console.log(`✅ LEADERBOARD: Fetched ${data?.length || 0} team entries at ${new Date().toLocaleTimeString()}`);

      if (data && data.length > 0) {
        console.log('📊 LEADERBOARD: First team data:', {
          team: data[0].team.name,
          points: data[0].points,
          matches_played: data[0].matches_played,
          matches_won: data[0].matches_won
        });
      }

      // Process and calculate additional stats
      const processedData = (data || []).map(entry => ({
        ...entry,
        matches_lost: (entry.matches_played || 0) - (entry.matches_won || 0),
        win_percentage: entry.matches_played > 0
          ? ((entry.matches_won || 0) / entry.matches_played) * 100
          : 0,
        points_per_match: entry.matches_played > 0
          ? (entry.points || 0) / entry.matches_played
          : 0,
      }));

      // Calculate total points (regular + bonus)
      const processedDataWithTotal = processedData.map(entry => ({
        ...entry,
        total_points: (entry.points || 0) + (entry.bonus_points || 0)
      }));
      
      // Sort by total points (descending), then by win percentage, then by matches won
      const sortedData = processedDataWithTotal.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.win_percentage !== a.win_percentage) return b.win_percentage - a.win_percentage;
        return b.matches_won - a.matches_won;
      });
      
      // Filter by division if selected (client-side filter)
      // Note: This should be redundant since we already filtered in the query,
      // but adding as a safety measure for consistency
      let filteredData = sortedData;
      if (selectedDivision !== 'all') {
        console.log('🔍 LEADERBOARD: Client-side filtering by division in fallback data:', selectedDivision);
        filteredData = sortedData.filter(entry => entry.division_id === selectedDivision);
        console.log(`🔍 LEADERBOARD: Filtered fallback data from ${sortedData.length} to ${filteredData.length} teams`);
      }

      // Apply maxEntries limit if specified
      const finalData = maxEntries ? filteredData.slice(0, maxEntries) : filteredData;

      // Force a complete re-render by creating a new array
      setLeaderboardData([...finalData]);
      console.log('✅ LEADERBOARD: Data processed and sorted');
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{position}</span>;
    }
  };

  const getRankBadgeVariant = (position: number) => {
    switch (position) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      case 3:
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading standings...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchLeaderboardData} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Leaderboard
            {selectedDivision !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {divisions.find(d => d.id === selectedDivision)?.name}
              </Badge>
            )}
          </CardTitle>

          {showDivisionFilter && divisions.length > 1 && (
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {leaderboardData.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Teams Yet</h3>
            <p className="text-muted-foreground">
              Teams will appear here once they join the league and start playing matches.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header for non-compact view */}
            {!compact && (
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3">Team</div>
                <div className="col-span-1 text-center">P</div>
                <div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">L</div>
                <div className="col-span-1 text-center">Win %</div>
                <div className="col-span-1 text-center">Bonus</div>
                <div className="col-span-2 text-center">Total</div>
                <div className="col-span-1 text-center"></div>
              </div>
            )}

            {leaderboardData.map((entry, index) => {
              const position = index + 1;

              return (
                <div
                  key={entry.id}
                  className={`
                    flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 p-4 rounded-lg border transition-colors
                    ${position <= 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200' : 'hover:bg-muted/50'}
                  `}
                >
                  {/* Mobile Layout */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getRankIcon(position)}
                        <div>
                          <h4 className="font-semibold">{entry.team.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {entry.team.player1.full_name} & {entry.team.player2.full_name}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getRankBadgeVariant(position)}>
                        #{position}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-primary">{(entry.points || 0) + (entry.bonus_points || 0)}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-amber-600">{entry.bonus_points || 0}</p>
                        <p className="text-xs text-muted-foreground">Bonus</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{entry.matches_won || 0}/{entry.matches_played || 0}</p>
                        <p className="text-xs text-muted-foreground">W/P</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{entry.win_percentage.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Win %</p>
                      </div>
                    </div>

                    {selectedDivision === 'all' && (
                      <Badge variant="outline" className="w-fit">
                        {entry.division.name}
                      </Badge>
                    )}
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:contents">
                    <div className="col-span-1 flex items-center">
                      {getRankIcon(position)}
                    </div>

                    <div className="col-span-3 flex flex-col">
                      <h4 className="font-semibold">{entry.team.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {entry.team.player1.full_name} & {entry.team.player2.full_name}
                      </p>
                      {selectedDivision === 'all' && (
                        <Badge variant="outline" className="w-fit mt-1">
                          {entry.division.name}
                        </Badge>
                      )}
                    </div>

                    <div className="col-span-1 text-center">
                      {entry.matches_played || 0}
                    </div>

                    <div className="col-span-1 text-center text-green-600 font-medium">
                      {entry.matches_won || 0}
                    </div>

                    <div className="col-span-1 text-center">
                      {entry.matches_lost || 0}
                    </div>

                    <div className="col-span-1 text-center">
                      {entry.win_percentage.toFixed(0)}%
                    </div>

                    <div className="col-span-1 text-center text-amber-600 font-medium">
                      {entry.bonus_points || 0}
                    </div>

                    <div className="col-span-2 text-center font-bold text-primary">
                      {(entry.points || 0) + (entry.bonus_points || 0)}
                    </div>

                    <div className="col-span-1"></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats summary for compact view */}
        {compact && leaderboardData.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total Teams: {leaderboardData.length}</span>
              <span>
                Leader: {leaderboardData[0]?.team.name} ({leaderboardData[0]?.points} pts)
              </span>
            </div>
          </div>
        )}

        {/* Refresh buttons */}
        <div className="mt-4 pt-4 border-t flex justify-center">
          <div className="flex flex-col items-center">
            <div
              className="text-xs text-muted-foreground mb-2"
              data-leaderboard-updated="true" // Marker for auto-refresh detection
            >
              Last updated: {new Date().toLocaleTimeString()}
            </div>

            <div className="flex gap-3">
              {/* Standard refresh button */}
              <Button
                onClick={() => {
                  console.log('🔄 LEADERBOARD: Manual refresh triggered');
                  setRefreshTrigger(prev => prev + 1);
                }}
                variant="outline"
                size="sm"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>

              {/* Force reload button */}
              <Button
                onClick={() => {
                  console.log('🔄 LEADERBOARD: Force page reload triggered');
                  window.location.reload();
                }}
                variant="outline"
                size="sm"
                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M8 16H3v5"></path>
                </svg>
                Reload Page
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              If standings don't update automatically, try Refresh Data or Reload Page
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;