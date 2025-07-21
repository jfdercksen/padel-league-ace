import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Trophy, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import ScoreRecordingModal from '@/components/ScoreRecordingModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Match } from '@/types/match';

interface MatchConfirmation {
  id: string;
  match_id: string;
  team_id: string;
  status: string;
  reschedule_reason?: string | null;
  match: {
    scheduled_date: string;
    scheduled_time: string;
    venue: string | null;
    team1: { name: string };
    team2: { name: string };
    league: { name: string };
    division: { name: string };
  };
}

//interface Match {
  //id: string;
  //scheduled_date: string;
  //scheduled_time: string | null;
  //venue: string | null;
  //status: string;
  //team1_score: number | null;
  //team2_score: number | null;
  //winner_team_id: string | null;
  //team1: { name: string };
  //team2: { name: string };
  //league: { name: string };
  //division: { name: string };
//}


const Matches = () => {
  const { profile } = useAuth();
  const canEditCompletedMatch = (match: Match) => {
    // Only allow admins to edit completed matches
    return profile?.role === 'league_admin' || profile?.role === 'super_admin';
  };
  const [pendingConfirmations, setPendingConfirmations] = useState<MatchConfirmation[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ confirmationId: '', reason: '' });
  const [showRescheduleForm, setShowRescheduleForm] = useState<string | null>(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedMatchForScoring, setSelectedMatchForScoring] = useState<Match | null>(null);

  useEffect(() => {
    if (profile) {
      fetchMatches();
    }
  }, [profile]);

    const fetchMatches = async () => {
  if (!profile) return;

  try {
    // Get teams where user is a player
    const { data: userTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`);

    if (teamsError) throw teamsError;
    const teamIds = userTeams?.map(t => t.id) || [];

    console.log('Team IDs:', teamIds);

    if (teamIds.length === 0) {
      setLoading(false);
      return;
    }

    // Get pending confirmations
    const supabaseAny = supabase as any;
      const { data: confirmations, error: confirmError } = await supabaseAny
        .from('match_confirmations')
        .select(`
          id,
          match_id,
          team_id,
          status,
          match:matches (
            scheduled_date,
            scheduled_time,
            venue,
            team1:teams!matches_team1_id_fkey(name),
            team2:teams!matches_team2_id_fkey(name),
            league:leagues(name),
            division:divisions(name)
          )
        `)
        .in('team_id', teamIds)
        .eq('status', 'pending');

      if (confirmError) throw confirmError;

      // Clean select fields
      const selectFields = `
        id,
        league_id,
        division_id,
        team1_id,
        team2_id,
        scheduled_date,
        scheduled_time,
        venue,
        status,
        team1_score,
        team2_score,
        winner_team_id,
        match_duration,
        created_at,
        updated_at,
        round_number,
        match_number,
        created_by,
        team1:teams!matches_team1_id_fkey(name),
        team2:teams!matches_team2_id_fkey(name),
        league:leagues(name),
        division:divisions(name)
      `;

      const [result1, result2] = await Promise.all([
        supabase
          .from('matches')
          .select(selectFields)
          .in('team1_id', teamIds)
          .order('updated_at', { ascending: false }), // Order by updated_at to get fresh data first
        supabase
          .from('matches')
          .select(selectFields)
          .in('team2_id', teamIds)
          .order('updated_at', { ascending: false })
      ]);

      if (result1.error) throw result1.error;
      if (result2.error) throw result2.error;

      // Combine and deduplicate matches
      const allMatchesData = [...(result1.data || []), ...(result2.data || [])];
      const uniqueMatches = allMatchesData.filter((match, index, self) => 
        index === self.findIndex(m => m.id === match.id)
      );

      // Sort by scheduled date
      uniqueMatches.sort((a, b) => new Date(b.scheduled_date || 0).getTime() - new Date(a.scheduled_date || 0).getTime());

      // IMPROVED FILTERING LOGIC - More explicit conditions
      const upcoming = uniqueMatches.filter(match => {
        const hasNoScores = match.team1_score === null && match.team2_score === null;
        const isConfirmed = match.status === 'confirmed';
        const isNotCompleted = match.status !== 'completed';
        return isConfirmed && hasNoScores && isNotCompleted;
      });
      
      const completed = uniqueMatches.filter(match => {
        const hasScores = match.team1_score !== null || match.team2_score !== null;
        const isCompleted = match.status === 'completed';
        return isCompleted || hasScores;
      });

      console.log('Filtering Debug:', {
        totalMatches: uniqueMatches.length,
        upcomingCount: upcoming.length,
        completedCount: completed.length,
        sampleMatches: uniqueMatches.slice(0, 2).map(m => ({
          id: m.id,
          status: m.status,
          team1_score: m.team1_score,
          team2_score: m.team2_score,
          teams: `${m.team1.name} vs ${m.team2.name}`
        }))
      });

      setPendingConfirmations(confirmations || []);
      setUpcomingMatches(upcoming);
      setCompletedMatches(completed);
      setAllMatches(uniqueMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

    const handleConfirmMatch = async (confirmationId: string) => {
      setProcessing(confirmationId);
      try {
        const supabaseAny = supabase as any;
        
        // Step 1: Get the match_id from this confirmation
        const { data: confirmationData, error: confirmError } = await supabaseAny
          .from('match_confirmations')
          .select('match_id')
          .eq('id', confirmationId)
          .single();

        if (confirmError) throw confirmError;

        // Step 2: Update this team's confirmation status
        const { data, error } = await supabaseAny
          .from('match_confirmations')
          .update({ 
            status: 'confirmed',
            responded_at: new Date().toISOString()
          })
          .eq('id', confirmationId)
          .select();

        if (error) throw error;

        // Step 3: Check if ALL teams have now confirmed this match
        const { data: allConfirmations, error: allConfirmError } = await supabaseAny
          .from('match_confirmations')
          .select('status')
          .eq('match_id', confirmationData.match_id);

        if (allConfirmError) throw allConfirmError;

        // Step 4: If all teams confirmed, update match status to 'confirmed'
        const allConfirmed = allConfirmations.every(conf => conf.status === 'confirmed');
        if (allConfirmed) {
          console.log('All teams confirmed - updating match status to confirmed');
          const { error: matchUpdateError } = await supabase
            .from('matches')
            .update({ status: 'confirmed' })
            .eq('id', confirmationData.match_id);
            
          if (matchUpdateError) {
            console.error('Error updating match status:', matchUpdateError);
          } else {
            console.log('✅ Match status updated to confirmed');
          }
        }

        // Step 5: Remove from pending list and refresh data
        setPendingConfirmations(prev => prev.filter(c => c.id !== confirmationId));
        await fetchMatches(); // Refresh to update upcoming matches
        
      } catch (error) {
        console.error('Error confirming match:', error);
      } finally {
        setProcessing(null);
      }
    };

  const handleRequestReschedule = async (confirmationId: string) => {
    if (!rescheduleForm.reason.trim()) {
      alert('Please provide a reason for rescheduling');
      return;
    }

    setProcessing(confirmationId);
    try {
      const supabaseAny = supabase as any;
      
      const { error } = await supabaseAny
        .from('match_confirmations')
        .update({ 
          status: 'reschedule_requested',
          reschedule_reason: rescheduleForm.reason,
          responded_at: new Date().toISOString()
        })
        .eq('id', confirmationId);

      if (error) throw error;

      // Remove from pending list
      setPendingConfirmations(prev => prev.filter(c => c.id !== confirmationId));
      setShowRescheduleForm(null);
      setRescheduleForm({ confirmationId: '', reason: '' });
      
    } catch (error) {
      console.error('Error requesting reschedule:', error);
    } finally {
      setProcessing(null);
    }
  };
  
  const debugUpcomingMatches = (allMatches: any[]) => {
    console.log('=== DEBUG UPCOMING MATCHES ===');
    allMatches.forEach((match, index) => {
      const isUpcoming = match.status === 'confirmed' && !match.team1_score && !match.team2_score;
      console.log(`${index + 1}. ${match.team1.name} vs ${match.team2.name} - Status: "${match.status}" - Upcoming: ${isUpcoming}`);
    });
  };

  const renderMatchCard = (match: Match, showActions = false) => {
    const isCompleted = match.status === 'completed' || (match.team1_score !== null && match.team2_score !== null);
    const canRecord = !isCompleted || canEditCompletedMatch(match);

    return (
      <Card key={match.id} className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4 sm:p-6">
          {/* Mobile-first layout */}
          <div className="space-y-4">
            {/* Header Row - Teams and Status */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                {/* Teams */}
                <h4 className="text-lg font-semibold leading-tight">
                  <span className="block sm:inline">{match.team1.name}</span>
                  <span className="hidden sm:inline text-muted-foreground mx-2">vs</span>
                  <span className="block sm:inline text-sm sm:text-lg text-muted-foreground sm:text-foreground">
                    vs {match.team2.name}
                  </span>
                </h4>
                
                {/* Score Display */}
                {match.team1_score !== null && match.team2_score !== null && (
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Final Score: <span className="font-semibold">{match.team1_score} - {match.team2_score}</span>
                  </p>
                )}
              </div>
              
              {/* Status Badge */}
              <div className="flex-shrink-0">
                <Badge className={`text-xs ${
                  match.status === 'completed' ? 'bg-green-100 text-green-800' :
                  match.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {match.status === 'completed' ? 'Completed' :
                  match.status === 'confirmed' ? 'Confirmed' :
                  match.status}
                </Badge>
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {match.league.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {match.division.name}
              </Badge>
            </div>
            
            {/* Match Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {new Date(match.scheduled_date).toLocaleDateString()}
                </span>
              </div>
              
              {match.scheduled_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{match.scheduled_time}</span>
                </div>
              )}
              
              {match.venue && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{match.venue}</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            {showActions && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                {/* Record Result button - improved condition */}
                {canRecord && match.status === 'confirmed' && (
                  <Button 
                    size="sm" 
                    className={`w-full sm:w-auto ${
                      isCompleted 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    onClick={() => {
                      setSelectedMatchForScoring(match);
                      setScoreModalOpen(true);
                    }}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    {isCompleted ? 'Edit Result' : 'Record Result'}
                  </Button>
                )}
                
                {/* Show read-only indicator for completed matches when user can't edit */}
                {isCompleted && !canEditCompletedMatch(match) && (
                  <Badge variant="secondary" className="text-xs self-start">
                    Result Recorded
                  </Badge>
                )}
                
                {/* View Details button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto"
                >
                  View Details
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (icon: any, title: string, description: string) => (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-8 px-4 text-center">
        {icon}
        <h3 className="font-semibold mb-2 text-base sm:text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading matches...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Matches</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track your upcoming games and match history
            </p>
          </div>

        <Tabs defaultValue="pending" className="space-y-6">
          {/* Mobile-optimized TabsList */}
          <div className="w-full overflow-x-auto">
            <TabsList className="grid grid-cols-4 w-full min-w-[500px] sm:min-w-0 gap-1 p-1">
              <TabsTrigger 
                value="pending" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0"
              >
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Pending</span>
                <span className="sm:hidden">Pending</span>
                {pendingConfirmations.length > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs min-w-[16px] h-4">
                    {pendingConfirmations.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="upcoming" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0"
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Upcoming</span>
                <span className="sm:hidden">Upcoming</span>
                {upcomingMatches.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs min-w-[16px] h-4">
                    {upcomingMatches.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="completed" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0"
              >
                <Trophy className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Completed</span>
                <span className="sm:hidden">Completed</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="all" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0"
              >
                {" "}
                <span className="hidden sm:inline">All Matches</span>
                <span className="sm:hidden">All</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pending Confirmations Tab */}
          <TabsContent value="pending">
            {pendingConfirmations.length === 0 ? (
              renderEmptyState(
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />,
                "No Pending Confirmations",
                "You don't have any matches waiting for confirmation"
              )
            ) : (
              <div className="space-y-4">
                {pendingConfirmations.map((confirmation) => (
                  <Card key={confirmation.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-semibold">
                              {confirmation.match.team1.name} vs {confirmation.match.team2.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {confirmation.match.league.name} • {confirmation.match.division.name}
                            </p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800">Pending Confirmation</Badge>
                        </div>

                        {/* Match Details */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="grid md:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">
                                {new Date(confirmation.match.scheduled_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">{confirmation.match.scheduled_time}</span>
                            </div>
                            {confirmation.match.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span className="text-sm">{confirmation.match.venue}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reschedule Form */}
                        {showRescheduleForm === confirmation.id ? (
                          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            <Label htmlFor={`reason-${confirmation.id}`}>Reason for Rescheduling *</Label>
                            <Textarea
                              id={`reason-${confirmation.id}`}
                              value={rescheduleForm.reason}
                              onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                              placeholder="Please explain why you need to reschedule this match..."
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRequestReschedule(confirmation.id)}
                                disabled={processing === confirmation.id || !rescheduleForm.reason.trim()}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Submit Request
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowRescheduleForm(null);
                                  setRescheduleForm({ confirmationId: '', reason: '' });
                                }}
                              >
                                Cancel
                              </Button>                              
                            </div>
                          </div>
                        ) : (
                          /* Action Buttons */
                          <div className="flex gap-3">
                            <Button
                              onClick={() => handleConfirmMatch(confirmation.id)}
                              disabled={processing === confirmation.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept Time
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowRescheduleForm(confirmation.id);
                                setRescheduleForm({ confirmationId: confirmation.id, reason: '' });
                              }}
                              disabled={processing === confirmation.id}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reschedule
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upcoming Matches Tab */}
          <TabsContent value="upcoming">
            {upcomingMatches.length === 0 ? (
              renderEmptyState(
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />,
                "No Upcoming Matches",
                "Your confirmed upcoming matches will appear here"
              )
            ) : (
              <div className="space-y-4">
                {upcomingMatches.map((match) => renderMatchCard(match, true))}
              </div>
            )}
          </TabsContent>

          {/* Completed Matches Tab */}
          <TabsContent value="completed">
            {completedMatches.length === 0 ? (
              renderEmptyState(
                <Trophy className="w-12 h-12 text-muted-foreground mb-4" />,
                "No Completed Matches",
                "Your completed matches will appear here"
              )
            ) : (
              <div className="space-y-4">
                {completedMatches.map((match) => renderMatchCard(match, true))}
              </div>
            )}
          </TabsContent>

          {/* All Matches Tab */}
          <TabsContent value="all">
            {allMatches.length === 0 ? (
              renderEmptyState(
                <Trophy className="w-12 h-12 text-muted-foreground mb-4" />,
                "No Matches Found",
                "Join a league and create a team to start playing"
              )
            ) : (
              <div className="space-y-4">
                {allMatches.map((match) => renderMatchCard(match, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        {/* Add this before the closing </div> */}
          <ScoreRecordingModal
            isOpen={scoreModalOpen}
            onClose={() => {
              setScoreModalOpen(false);
              setSelectedMatchForScoring(null);
            }}
            match={selectedMatchForScoring}
            onScoreRecorded={() => {
              fetchMatches(); // Refresh the matches data
            }}
          />
      </div>
    </div>
  );
};

export default Matches;