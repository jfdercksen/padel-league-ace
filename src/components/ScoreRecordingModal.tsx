import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy, X, Save, MapPin, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Update the Match interface to be more flexible
interface Match {
  id: string;
  team1: { name: string };
  team2: { name: string };
  team1_id: string;
  team2_id: string;
  league?: { name: string }; // Make optional
  division: { name: string };
  scheduled_date: string;
  scheduled_time?: string;
  venue?: string;
}

interface ScoreRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  onScoreRecorded: () => void;
}

interface SetScore {
  team1Games: string;
  team2Games: string;
}

const ScoreRecordingModal = ({ isOpen, onClose, match, onScoreRecorded }: ScoreRecordingModalProps) => {
  const [sets, setSets] = useState<SetScore[]>([
    { team1Games: '', team2Games: '' },
    { team1Games: '', team2Games: '' },
    { team1Games: '', team2Games: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!match) return null;

  // Reset form when modal opens
  const handleOpen = () => {
    setSets([
      { team1Games: '', team2Games: '' },
      { team1Games: '', team2Games: '' },
      { team1Games: '', team2Games: '' }
    ]);
    setError(null);
  };

  // Update a specific set score
  const updateSetScore = (setIndex: number, team: 'team1Games' | 'team2Games', value: string) => {
    // Only allow valid game scores (0-7, accounting for tiebreaks)
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 7)) {
      setSets(prev => prev.map((set, index) =>
        index === setIndex ? { ...set, [team]: value } : set
      ));
      setError(null);
    }
  };

  // Validate set scores
  const validateSets = () => {
    const filledSets = sets.filter(set => set.team1Games !== '' && set.team2Games !== '');

    if (filledSets.length === 0) {
      return { valid: false, error: 'Please enter at least one set score' };
    }

    // Check each filled set for valid padel scoring
    for (let i = 0; i < filledSets.length; i++) {
      const set = filledSets[i];
      const team1Games = parseInt(set.team1Games);
      const team2Games = parseInt(set.team2Games);

      // Basic padel set validation
      const maxGames = Math.max(team1Games, team2Games);
      const minGames = Math.min(team1Games, team2Games);

      if (maxGames < 6) {
        return { valid: false, error: `Set ${i + 1}: Winner must have at least 6 games` };
      }

      if (maxGames === 6 && minGames >= 6) {
        return { valid: false, error: `Set ${i + 1}: Invalid score. At 6-6, the set should go to 7-6 or tiebreak` };
      }

      if (maxGames === 7 && minGames < 5) {
        return { valid: false, error: `Set ${i + 1}: If winner has 7 games, loser must have 5 or 6` };
      }

      if (maxGames > 7) {
        return { valid: false, error: `Set ${i + 1}: Maximum games in a set is 7` };
      }
    }

    // Must have 2 or 3 sets for a complete match
    if (filledSets.length < 2) {
      return { valid: false, error: 'Match must have at least 2 sets' };
    }

    // Calculate set wins to determine match winner
    let team1SetWins = 0;
    let team2SetWins = 0;

    filledSets.forEach(set => {
      const team1Games = parseInt(set.team1Games);
      const team2Games = parseInt(set.team2Games);

      if (team1Games > team2Games) {
        team1SetWins++;
      } else {
        team2SetWins++;
      }
    });

    // Check if match is complete (someone won 2 sets)
    if (Math.max(team1SetWins, team2SetWins) < 2) {
      return { valid: false, error: 'Match incomplete: Someone must win 2 sets' };
    }

    return { valid: true, team1SetWins, team2SetWins };
  };

  // Calculate final score string
  const generateScoreString = () => {
    const filledSets = sets.filter(set => set.team1Games !== '' && set.team2Games !== '');
    return filledSets.map(set => `${set.team1Games}-${set.team2Games}`).join(', ');
  };

  // ENHANCED: Multiple event dispatch methods for maximum compatibility
  const triggerAllRefreshEvents = (leagueId: string) => {
    console.log('🚀 TRIGGERING ALL REFRESH EVENTS...');

    // Method 1: Custom scoreRecorded event - ENSURE THIS IS PROPERLY CREATED
    console.log('📡 Dispatching scoreRecorded event...');
    try {
      // Use both methods to maximize compatibility
      window.dispatchEvent(new Event('scoreRecorded'));
      window.dispatchEvent(new CustomEvent('scoreRecorded'));
    } catch (e) {
      console.error('Error dispatching scoreRecorded event:', e);
    }

    // Method 2: Custom event with detail
    console.log('📡 Dispatching leaderboardRefresh event...');
    try {
      window.dispatchEvent(new CustomEvent('leaderboardRefresh', {
        detail: { timestamp: Date.now(), matchId: match.id, leagueId }
      }));
    } catch (e) {
      console.error('Error dispatching leaderboardRefresh event:', e);
    }

    // Method 3: Force all components to refresh by updating a global counter
    console.log('📡 Updating global refresh counter...');
    try {
      if ((window as any).globalRefreshCounter === undefined) {
        (window as any).globalRefreshCounter = 0;
      }
      (window as any).globalRefreshCounter++;
      window.dispatchEvent(new CustomEvent('globalRefresh', {
        detail: { counter: (window as any).globalRefreshCounter, leagueId }
      }));
    } catch (e) {
      console.error('Error dispatching globalRefresh event:', e);
    }

    // Method 4: Direct refresh calls (if available)
    try {
      if ((window as any).refreshAllLeaderboards) {
        console.log('📡 Calling direct refresh function...');
        (window as any).refreshAllLeaderboards();
      }
    } catch (e) {
      console.error('Error calling refreshAllLeaderboards:', e);
    }

    // Method 5: Store timestamp for mount-based refresh
    console.log('📡 Storing last update timestamp...');
    try {
      localStorage.setItem('lastMatchUpdate', Date.now().toString());
      localStorage.setItem('lastMatchLeague', leagueId);
    } catch (e) {
      console.error('Error setting localStorage:', e);
    }

    console.log('✅ All refresh events dispatched');
  };

  // Submit the score
  const handleSubmit = async () => {
    const validation = validateSets();

    if (!validation.valid) {
      setError(validation.error || 'Invalid score');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Use the score string for logging
      const scoreString = generateScoreString();
      console.log('Match score:', scoreString);

      const team1SetWins = validation.team1SetWins || 0;
      const team2SetWins = validation.team2SetWins || 0;
      const winnerId = team1SetWins > team2SetWins ? match.team1_id : match.team2_id;

      console.log('=== MATCH UPDATE DEBUG ===');
      console.log('Match ID:', match.id);
      console.log('Team1 Score:', team1SetWins);
      console.log('Team2 Score:', team2SetWins);
      console.log('Winner ID:', winnerId);
      console.log('Status will be set to: completed');

      // Update the match with results
      const { data: updatedMatch, error: matchError } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          team1_score: team1SetWins,
          team2_score: team2SetWins,
          winner_team_id: winnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', match.id)
        .select(); // Add select to see what was updated

      console.log('=== MATCH UPDATE RESULT ===');
      console.log('Error:', matchError);
      console.log('Updated data:', updatedMatch);

      if (matchError) {
        console.error('Match update failed:', matchError);
        throw matchError;
      }

      if (!updatedMatch || updatedMatch.length === 0) {
        console.error('No match was updated - this means the match ID might be wrong');
        throw new Error('No match was updated');
      }

      console.log('✅ Match updated successfully:', updatedMatch[0]);

      // Get the league ID from the updated match data
      const leagueId = updatedMatch[0]?.league_id || 'unknown';

      // IMPORTANT CHANGE: Update team statistics BEFORE closing modal
      // This ensures all database operations are complete before UI updates
      console.log('Updating team statistics...');
      console.log('Team 1 ID:', match.team1_id);
      console.log('Team 2 ID:', match.team2_id);
      console.log('League ID:', leagueId);
      console.log('Team 1 won:', team1SetWins > team2SetWins);
      console.log('Team 2 won:', team2SetWins > team1SetWins);

      // Define variables outside the try/catch block so they're accessible later
      let team1Result = null;
      let team2Result = null;

      try {
        // Get current stats for both teams first
        const { data: team1CurrentStats } = await supabase
          .from('league_registrations')
          .select('matches_played, matches_won, points')
          .eq('team_id', match.team1_id)
          .eq('league_id', leagueId)
          .single();

        const { data: team2CurrentStats } = await supabase
          .from('league_registrations')
          .select('matches_played, matches_won, points')
          .eq('team_id', match.team2_id)
          .eq('league_id', leagueId)
          .single();

        console.log('Current team 1 stats:', team1CurrentStats);
        console.log('Current team 2 stats:', team2CurrentStats);

        // Calculate new stats
        // Check for 3-0 win (clean sweep) to award bonus point
        const team1BonusPoint = team1SetWins === 3 && team2SetWins === 0 ? 1 : 0;
        const team2BonusPoint = team2SetWins === 3 && team1SetWins === 0 ? 1 : 0;
        
        const team1NewStats = {
          matches_played: (team1CurrentStats?.matches_played || 0) + 1,
          matches_won: (team1CurrentStats?.matches_won || 0) + (team1SetWins > team2SetWins ? 1 : 0),
          points: (team1CurrentStats?.points || 0) + (team1SetWins > team2SetWins ? 3 : 1) + team1BonusPoint,
          bonus_points: (team1CurrentStats?.bonus_points || 0) + team1BonusPoint
        };

        const team2NewStats = {
          matches_played: (team2CurrentStats?.matches_played || 0) + 1,
          matches_won: (team2CurrentStats?.matches_won || 0) + (team2SetWins > team1SetWins ? 1 : 0),
          points: (team2CurrentStats?.points || 0) + (team2SetWins > team1SetWins ? 3 : 1) + team2BonusPoint,
          bonus_points: (team2CurrentStats?.bonus_points || 0) + team2BonusPoint
        };

        console.log('New team 1 stats:', team1NewStats);
        console.log('New team 2 stats:', team2NewStats);

        // Store the calculated stats for immediate UI update
        team1Result = {
          team_id: match.team1_id,
          ...team1NewStats
        };
        
        team2Result = {
          team_id: match.team2_id,
          ...team2NewStats
        };

        // Update team 1 stats directly
        console.log('Updating team 1 stats...');
        const { error: team1Error } = await supabase
          .from('league_registrations')
          .update(team1NewStats)
          .eq('team_id', match.team1_id)
          .eq('league_id', leagueId);

        if (team1Error) {
          console.error('Error updating team 1 stats:', team1Error);
        } else {
          console.log('✅ Team 1 stats updated successfully');
        }

        // Update team 2 stats directly
        console.log('Updating team 2 stats...');
        const { error: team2Error } = await supabase
          .from('league_registrations')
          .update(team2NewStats)
          .eq('team_id', match.team2_id)
          .eq('league_id', leagueId);

        if (team2Error) {
          console.error('Error updating team 2 stats:', team2Error);
        } else {
          console.log('✅ Team 2 stats updated successfully');
        }
      } catch (statsError) {
        console.error('Error updating team stats:', statsError);
      }

      console.log('✅ Score recorded and team stats updated successfully');

      // Trigger all refresh events before closing modal
      console.log('🏆 Triggering all refresh events');
      triggerAllRefreshEvents(leagueId);

      // Store updated team stats in localStorage for immediate UI update
      try {
        const updatedStats = [
          { 
            teamId: match.team1_id, 
            leagueId, 
            points: team1Result?.points, 
            bonus_points: team1Result?.bonus_points,
            matches_played: team1Result?.matches_played, 
            matches_won: team1Result?.matches_won 
          },
          { 
            teamId: match.team2_id, 
            leagueId, 
            points: team2Result?.points, 
            bonus_points: team2Result?.bonus_points,
            matches_played: team2Result?.matches_played, 
            matches_won: team2Result?.matches_won 
          }
        ];
        localStorage.setItem('updatedTeamStats', JSON.stringify(updatedStats));
        console.log('✅ Updated team stats stored in localStorage for immediate UI update');
      } catch (e) {
        console.error('Error storing team stats in localStorage:', e);
      }

      // Call the original callback
      onScoreRecorded();

      // Close modal
      onClose();

      // Use a small delay to ensure the modal is closed before reload
      setTimeout(() => {
        // Force a complete page reload
        window.location.reload();
      }, 500);

      console.log('Page reload scheduled...');

    } catch (error) {
      console.error('Error recording score:', error);
      setError('Failed to record score. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // This function has been replaced by inline code in handleSubmit

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) handleOpen();
      else onClose();
    }}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5" />
            Record Match Result
          </DialogTitle>
          <DialogDescription>
            Enter the final scores for this match
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Match Info - Mobile Optimized */}
          <Card>
            <CardHeader className="pb-3">
              <div className="space-y-2">
                <h3 className="font-semibold text-base sm:text-lg leading-tight">
                  <span className="block sm:inline">{match.team1?.name || 'Team 1'}</span>
                  <span className="hidden sm:inline text-muted-foreground mx-2">vs</span>
                  <span className="block sm:inline">{match.team2?.name || 'Team 2'}</span>
                </h3>

                <div className="flex flex-wrap gap-2">
                  {match.league?.name && (
                    <Badge variant="outline" className="text-xs">
                      {match.league.name}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {match.division?.name || 'Division'}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    Best of 3 Sets
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(match.scheduled_date).toLocaleDateString()}</span>
                    {match.scheduled_time && (
                      <>
                        <Clock className="w-4 h-4 ml-2" />
                        <span>{match.scheduled_time}</span>
                      </>
                    )}
                  </div>
                  {match.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{match.venue}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Score Entry - Mobile Optimized */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Enter Set Scores</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter games won by each team. Standard padel: first to 6 games (or 7-6).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {sets.map((set, index) => (
                <div key={index} className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      Set {index + 1}
                    </span>
                  </Label>

                  {/* Mobile-First Score Input */}
                  <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                    {/* Team 1 Score */}
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground block mb-1">
                        {match.team1?.name || 'Team 1'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="7"
                        value={set.team1Games}
                        onChange={(e) => updateSetScore(index, 'team1Games', e.target.value)}
                        placeholder="0"
                        className="text-center text-lg font-medium h-12"
                      />
                    </div>

                    {/* VS Divider */}
                    <div className="flex items-center justify-center">
                      <div className="text-lg font-bold text-muted-foreground bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center">
                        -
                      </div>
                    </div>

                    {/* Team 2 Score */}
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground block mb-1">
                        {match.team2?.name || 'Team 2'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="7"
                        value={set.team2Games}
                        onChange={(e) => updateSetScore(index, 'team2Games', e.target.value)}
                        placeholder="0"
                        className="text-center text-lg font-medium h-12"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Score Preview - Mobile Optimized */}
              {sets.some(set => set.team1Games !== '' && set.team2Games !== '') && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-medium text-blue-800 block mb-1">
                    Match Score Preview:
                  </Label>
                  <p className="text-base sm:text-lg font-bold text-blue-900">
                    {generateScoreString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Record Result
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScoreRecordingModal;