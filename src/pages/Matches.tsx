import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Calendar, Clock, MapPin, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ScoreRecordingModal from '@/components/ScoreRecordingModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MatchConfirmation {
  id: string;
  match_id: string;
  team_id: string;
  status: string;
  reschedule_reason?: string | null;
  responded_at?: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
  proposal_message?: string | null;
  reschedule_round?: number;
  otherTeamConfirmation?: {
    id: string;
    status: string;
    responded_at?: string | null;
    proposed_date?: string | null;
    proposed_time?: string | null;
    proposal_message?: string | null;
  } | null;
  otherTeamName?: string;
  myTeamName?: string;
  match: {
    id: string;
    scheduled_date: string;
    scheduled_time: string | null;
    venue: string | null;
    status: string;
    team1_id: string;
    team2_id: string;
    team1: { id: string; name: string };
    team2: { id: string; name: string };
    league: { name: string };
    division: { name: string };
  };
}

interface Match {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  venue: string | null;
  status: string;
  team1_score: number | null;
  team2_score: number | null;
  winner_team_id: string | null;
  team1_id?: string;
  team2_id?: string;
  team1: { id?: string; name: string };
  team2: { id?: string; name: string };
  league: { name: string };
  division: { 
    name: string;
    level?: number;
  };
}


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
  const [rescheduleForm, setRescheduleForm] = useState({ 
    confirmationId: '', 
    reason: '',
    proposedDate: '',
    proposedTime: ''
  });
  const [showRescheduleForm, setShowRescheduleForm] = useState<string | null>(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedMatchForScoring, setSelectedMatchForScoring] = useState<Match | null>(null);

  useEffect(() => {
    if (profile) {
      fetchMatches();
    } else {
      setLoading(false);
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

    // Get ALL confirmations for user's teams (not just pending)
    const supabaseAny = supabase as any;
    const { data: userConfirmations, error: confirmError } = await supabaseAny
      .from('match_confirmations')
      .select(`
        id,
        match_id,
        team_id,
        status,
        reschedule_reason,
        responded_at,
        proposed_date,
        proposed_time,
        proposal_message,
        reschedule_round,
        match:matches (
          id,
          scheduled_date,
          scheduled_time,
          venue,
          status,
          team1_id,
          team2_id,
          team1:teams!matches_team1_id_fkey(id, name),
          team2:teams!matches_team2_id_fkey(id, name),
          league:leagues(name),
          division:divisions(name)
        )
      `)
      .in('team_id', teamIds);

    if (confirmError) throw confirmError;

    // For each user confirmation, get the OTHER team's confirmation status using RPC
    const confirmationsWithPartnerStatus = await Promise.all(
      (userConfirmations || []).map(async (conf: any) => {
        // Skip if match is already completed or confirmed
        if (conf.match?.status === 'completed' || conf.match?.status === 'confirmed') {
          return null;
        }

        // Use RPC to get all confirmations for this match (bypasses RLS)
        const { data: allMatchConfirmations, error: rpcError } = await (supabase as any).rpc(
          'get_match_confirmations_status',
          { p_match_id: conf.match_id }
        );

        if (rpcError) {
          console.error('Error fetching match confirmations:', rpcError);
          return null;
        }

        // Find the other team's confirmation
        const otherConfirmation = (allMatchConfirmations || []).find(
          (mc: any) => mc.team_id !== conf.team_id
        );

        // Find my team's name from the confirmations or match data
        const myTeamName = conf.match?.team1_id === conf.team_id
          ? conf.match?.team1?.name
          : conf.match?.team2?.name;

        const otherTeamName = conf.match?.team1_id === conf.team_id
          ? conf.match?.team2?.name
          : conf.match?.team1?.name;

        return {
          ...conf,
          otherTeamConfirmation: otherConfirmation ? {
            id: otherConfirmation.confirmation_id,
            status: otherConfirmation.status,
            responded_at: otherConfirmation.responded_at,
            proposed_date: otherConfirmation.proposed_date,
            proposed_time: otherConfirmation.proposed_time,
            proposal_message: otherConfirmation.proposal_message
          } : null,
          otherTeamName,
          myTeamName
        };
      })
    );

    // Filter: Show confirmations where user hasn't confirmed yet OR is waiting for other team
    const pendingAndWaiting = confirmationsWithPartnerStatus.filter(conf => {
      if (!conf) return false;
      // Show if user's confirmation is still pending
      if (conf.status === 'pending') return true;
      // Show if user confirmed but other team hasn't (waiting state)
      if (conf.status === 'confirmed' && conf.otherTeamConfirmation?.status === 'pending') return true;
      // Show reschedule statuses
      if (conf.status === 'reschedule_proposed') return true;
      if (conf.status === 'reschedule_pending') return true;
      return false;
    });

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

      console.log('🔍 Debug - pendingAndWaiting:', pendingAndWaiting.map(c => ({
        id: c?.id,
        myTeam: c?.myTeamName,
        myStatus: c?.status,
        otherTeam: c?.otherTeamName,
        otherStatus: c?.otherTeamConfirmation?.status
      })));
      setPendingConfirmations(pendingAndWaiting);
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
      // Call the RPC function that handles confirmation with proper permissions
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny.rpc('confirm_match_for_team', {
        p_confirmation_id: confirmationId,
        p_user_id: profile?.id
      });

      if (error) {
        console.error('Error confirming match:', error);
        throw error;
      }

      console.log('Confirmation result:', data);

      const result = data as any;
      if (result?.success) {
        if (result.all_confirmed) {
          console.log('✅ All teams confirmed - match is now confirmed');
        } else {
          console.log(`⏳ Waiting for other team (${result.confirmed_count}/${result.total_count} confirmed)`);
        }
      } else {
        console.error('Confirmation failed:', result?.message);
      }

      // Refresh the matches list
      await fetchMatches();
      
    } catch (error) {
      console.error('Error confirming match:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleProposeReschedule = async (confirmationId: string) => {
    if (!rescheduleForm.proposedDate) {
      alert('Please select a proposed date');
      return;
    }

    setProcessing(confirmationId);
    try {
      const { data, error } = await (supabase as any).rpc('propose_reschedule', {
        p_confirmation_id: confirmationId,
        p_user_id: profile?.id,
        p_proposed_date: rescheduleForm.proposedDate,
        p_proposed_time: rescheduleForm.proposedTime || null,
        p_message: rescheduleForm.reason || null
      });

      if (error) throw error;

      console.log('Propose reschedule result:', data);

      if (data?.success) {
        setShowRescheduleForm(null);
        setRescheduleForm({ confirmationId: '', reason: '', proposedDate: '', proposedTime: '' });
        await fetchMatches();
      } else {
        alert(data?.message || 'Failed to propose reschedule');
      }
    } catch (error) {
      console.error('Error proposing reschedule:', error);
      alert('Failed to propose reschedule');
    } finally {
      setProcessing(null);
    }
  };

  const handleAcceptReschedule = async (confirmationId: string) => {
    setProcessing(confirmationId);
    try {
      const { data, error } = await (supabase as any).rpc('accept_reschedule', {
        p_confirmation_id: confirmationId,
        p_user_id: profile?.id
      });

      if (error) throw error;

      console.log('Accept reschedule result:', data);

      if (data?.success) {
        await fetchMatches();
      } else {
        alert(data?.message || 'Failed to accept reschedule');
      }
    } catch (error) {
      console.error('Error accepting reschedule:', error);
      alert('Failed to accept reschedule');
    } finally {
      setProcessing(null);
    }
  };

  const handleCounterPropose = async (confirmationId: string) => {
    if (!rescheduleForm.proposedDate) {
      alert('Please select a proposed date');
      return;
    }

    setProcessing(confirmationId);
    try {
      const { data, error } = await (supabase as any).rpc('counter_propose_reschedule', {
        p_confirmation_id: confirmationId,
        p_user_id: profile?.id,
        p_proposed_date: rescheduleForm.proposedDate,
        p_proposed_time: rescheduleForm.proposedTime || null,
        p_message: rescheduleForm.reason || null
      });

      if (error) throw error;

      console.log('Counter propose result:', data);

      if (data?.success) {
        setShowRescheduleForm(null);
        setRescheduleForm({ confirmationId: '', reason: '', proposedDate: '', proposedTime: '' });
        await fetchMatches();
      } else {
        alert(data?.message || 'Failed to counter-propose');
      }
    } catch (error) {
      console.error('Error counter-proposing:', error);
      alert('Failed to counter-propose');
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
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading matches...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold">Please sign in</h2>
          <p className="text-muted-foreground text-sm">You need an account to view matches.</p>
          <Link to="/">
            <Button size="sm">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Matches</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your upcoming games and match history
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full gap-1 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger 
              value="pending" 
              className="flex flex-col items-center gap-1 text-xs sm:text-sm px-2 py-2"
            >
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>Pending</span>
              {pendingConfirmations.length > 0 && (
                <Badge variant="destructive" className="px-1 py-0 text-[10px] min-w-[16px] h-4">
                  {pendingConfirmations.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="upcoming" 
              className="flex flex-col items-center gap-1 text-xs sm:text-sm px-2 py-2"
            >
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>Upcoming</span>
              {upcomingMatches.length > 0 && (
                <Badge variant="secondary" className="px-1 py-0 text-[10px] min-w-[16px] h-4">
                  {upcomingMatches.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="completed" 
              className="flex flex-col items-center gap-1 text-xs sm:text-sm px-2 py-2"
            >
              <Trophy className="w-4 h-4 flex-shrink-0" />
              <span>Completed</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="all" 
              className="flex flex-col items-center gap-1 text-xs sm:text-sm px-2 py-2"
            >
              <span>All</span>
            </TabsTrigger>
          </TabsList>

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
                {pendingConfirmations.map((confirmation) => {
                  const userHasAccepted = confirmation.status === 'confirmed';
                  const otherTeamHasAccepted = confirmation.otherTeamConfirmation?.status === 'confirmed';
                  const isWaitingForOther = userHasAccepted && !otherTeamHasAccepted;

                  // Reschedule states
                  const hasProposedReschedule = confirmation.status === 'reschedule_proposed';
                  const hasReceivedProposal = confirmation.status === 'reschedule_pending';

                  // Determine card style based on status
                  const getCardStyle = () => {
                    if (hasReceivedProposal) return 'border-l-purple-500 bg-purple-50/30';
                    if (hasProposedReschedule) return 'border-l-orange-500 bg-orange-50/30';
                    if (isWaitingForOther) return 'border-l-blue-500 bg-blue-50/30';
                    return 'border-l-yellow-500';
                  };

                  // Determine status badge
                  const getStatusBadge = () => {
                    if (hasReceivedProposal) {
                      return (
                        <Badge className="bg-purple-100 text-purple-800 w-fit">
                          <Calendar className="w-3 h-3 mr-1" />
                          New Date Proposed
                        </Badge>
                      );
                    }
                    if (hasProposedReschedule) {
                      return (
                        <Badge className="bg-orange-100 text-orange-800 w-fit">
                          <Clock className="w-3 h-3 mr-1" />
                          Awaiting Response
                        </Badge>
                      );
                    }
                    if (isWaitingForOther) {
                      return (
                        <Badge className="bg-blue-100 text-blue-800 w-fit">
                          <Clock className="w-3 h-3 mr-1" />
                          Waiting for {confirmation.otherTeamName}
                        </Badge>
                      );
                    }
                    return (
                      <Badge className="bg-yellow-100 text-yellow-800 w-fit">
                        Pending Your Confirmation
                      </Badge>
                    );
                  };

                  return (
                    <Card
                      key={confirmation.id}
                      className={`border-l-4 ${getCardStyle()}`}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-lg font-semibold">
                                {confirmation.match.team1.name} vs {confirmation.match.team2.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {confirmation.match.league.name} • {confirmation.match.division.name}
                              </p>
                            </div>
                            {getStatusBadge()}
                          </div>

                          {/* Current Match Details */}
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">Current Schedule:</p>
                            <div className="flex flex-wrap gap-3 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                {new Date(confirmation.match.scheduled_date).toLocaleDateString()}
                              </span>
                              {confirmation.match.scheduled_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  {confirmation.match.scheduled_time}
                                </span>
                              )}
                              {confirmation.match.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                  {confirmation.match.venue}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reschedule Proposal Display - When you received a proposal */}
                          {hasReceivedProposal && confirmation.proposed_date && (
                            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg space-y-3">
                              <div className="flex items-center gap-2 text-purple-800">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-semibold">{confirmation.otherTeamName} proposed a new date:</span>
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm font-medium">
                                <span className="flex items-center gap-1 bg-white px-3 py-1 rounded">
                                  <Calendar className="w-4 h-4 text-purple-600" />
                                  {new Date(confirmation.proposed_date).toLocaleDateString()}
                                </span>
                                {confirmation.proposed_time && (
                                  <span className="flex items-center gap-1 bg-white px-3 py-1 rounded">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                    {confirmation.proposed_time}
                                  </span>
                                )}
                              </div>
                              {confirmation.proposal_message && (
                                <p className="text-sm text-purple-700 italic">
                                  "{confirmation.proposal_message}"
                                </p>
                              )}
                              <p className="text-xs text-purple-600">
                                Round {confirmation.reschedule_round || 1} of 3
                              </p>
                            </div>
                          )}

                          {/* Reschedule Proposal Display - When you proposed */}
                          {hasProposedReschedule && confirmation.proposed_date && (
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg space-y-2">
                              <p className="text-sm text-orange-800">
                                <span className="font-semibold">You proposed:</span>
                              </p>
                              <div className="flex flex-wrap gap-3 text-sm">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 text-orange-600" />
                                  {new Date(confirmation.proposed_date).toLocaleDateString()}
                                </span>
                                {confirmation.proposed_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-orange-600" />
                                    {confirmation.proposed_time}
                                  </span>
                                )}
                              </div>
                              {confirmation.proposal_message && (
                                <p className="text-sm text-orange-700 italic">
                                  "{confirmation.proposal_message}"
                                </p>
                              )}
                              <p className="text-xs text-orange-600">
                                Waiting for {confirmation.otherTeamName} to respond...
                              </p>
                            </div>
                          )}

                          {/* Other team accepted message */}
                          {otherTeamHasAccepted && !userHasAccepted && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">
                                {confirmation.otherTeamName} has already accepted this match!
                              </span>
                            </div>
                          )}

                          {/* Waiting message after user accepts */}
                          {isWaitingForOther && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700">
                              <Clock className="w-5 h-5 animate-pulse" />
                              <span className="text-sm font-medium">
                                You've accepted! Waiting for {confirmation.otherTeamName} to confirm...
                              </span>
                            </div>
                          )}

                          {/* Reschedule Form */}
                          {showRescheduleForm === confirmation.id && (
                            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                              <h5 className="font-medium">Propose New Date & Time</h5>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`date-${confirmation.id}`}>Proposed Date *</Label>
                                  <Input
                                    id={`date-${confirmation.id}`}
                                    type="date"
                                    value={rescheduleForm.proposedDate}
                                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, proposedDate: e.target.value }))}
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`time-${confirmation.id}`}>Proposed Time</Label>
                                  <Input
                                    id={`time-${confirmation.id}`}
                                    type="time"
                                    value={rescheduleForm.proposedTime}
                                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, proposedTime: e.target.value }))}
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`reason-${confirmation.id}`}>Message (optional)</Label>
                                <Textarea
                                  id={`reason-${confirmation.id}`}
                                  value={rescheduleForm.reason}
                                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                                  placeholder="Let them know why you need to reschedule..."
                                  rows={2}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => hasReceivedProposal 
                                    ? handleCounterPropose(confirmation.id)
                                    : handleProposeReschedule(confirmation.id)
                                  }
                                  disabled={processing === confirmation.id || !rescheduleForm.proposedDate}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  {processing === confirmation.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  ) : (
                                    <Calendar className="w-4 h-4 mr-2" />
                                  )}
                                  {hasReceivedProposal ? 'Send Counter-Proposal' : 'Send Proposal'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setShowRescheduleForm(null);
                                    setRescheduleForm({ confirmationId: '', reason: '', proposedDate: '', proposedTime: '' });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {!showRescheduleForm && (
                            <div className="flex flex-col sm:flex-row gap-3">
                              {/* Accept/Confirm Button - Show for pending or received proposals */}
                              {(confirmation.status === 'pending' || hasReceivedProposal) && (
                                <Button
                                  onClick={() => hasReceivedProposal 
                                    ? handleAcceptReschedule(confirmation.id)
                                    : handleConfirmMatch(confirmation.id)
                                  }
                                  disabled={processing === confirmation.id}
                                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                                >
                                  {processing === confirmation.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                  )}
                                  {hasReceivedProposal ? 'Accept New Date' : 'Accept Match'}
                                </Button>
                              )}
                              
                              {/* Reschedule/Counter-Propose Button */}
                              {(confirmation.status === 'pending' || hasReceivedProposal) && (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowRescheduleForm(confirmation.id);
                                    setRescheduleForm({ 
                                      confirmationId: confirmation.id, 
                                      reason: '',
                                      proposedDate: hasReceivedProposal && confirmation.proposed_date 
                                        ? confirmation.proposed_date 
                                        : '',
                                      proposedTime: hasReceivedProposal && confirmation.proposed_time 
                                        ? confirmation.proposed_time 
                                        : ''
                                    });
                                  }}
                                  disabled={processing === confirmation.id}
                                  className="flex-1 sm:flex-none"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  {hasReceivedProposal ? 'Propose Different Date' : 'Request Reschedule'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
  );
};

export default Matches;