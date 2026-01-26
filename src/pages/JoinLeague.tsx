import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, MapPin, DollarSign, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

interface Team {
  id: string;
  name: string;
  player1_id: string;
  player2_id: string | null;
  player1?: { full_name: string };
  player2?: { full_name: string } | null;
}

interface League {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_at: string | null;
  created_by: string;
  match_format: string | null;
  max_teams_per_division: number | null;
  status: string;
  updated_at: string | null;
}

interface Division {
  id: string;
  name: string;
  level: number;
  max_teams: number;
}

const JoinLeague = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!teamId || !profile) return;

      try {
        // Fetch team details
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select(`
            *,
            player1:profiles!teams_player1_id_fkey(full_name),
            player2:profiles!teams_player2_id_fkey(full_name)
          `)
          .eq('id', teamId)
          .single();

        if (teamError) throw teamError;

        // Check if user is part of this team
        const isTeamMember = teamData.player1_id === profile.id || teamData.player2_id === profile.id;
        if (!isTeamMember) {
          navigate('/teams');
          return;
        }

        // Check if team is complete (has both players)
        if (!teamData.player2_id) {
          setError('Your team needs a second player before joining a league.');
          setTeam(teamData);
          setLoading(false);
          return;
        }

        setTeam(teamData);

        // Fetch available leagues (open for registration)
        const { data: leaguesData, error: leaguesError } = await supabase
          .from('leagues')
          .select('*')
          .in('status', ['draft', 'registration_open', 'active'])
          .order('start_date', { ascending: true });

        console.log('Available leagues:', leaguesData, 'Error:', leaguesError); // Debug log

        if (leaguesError) throw leaguesError;

        setLeagues(leaguesData || []);

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('Failed to load league information');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, profile, navigate]);

  useEffect(() => {
    const fetchDivisions = async () => {
      if (!selectedLeague) {
        setDivisions([]);
        return;
      }

      try {
        const { data: divisionsData, error } = await supabase
          .from('divisions')
          .select('*')
          .eq('league_id', selectedLeague)
          .order('level', { ascending: true });

        if (error) throw error;
        setDivisions(divisionsData || []);
      } catch (err) {
        console.error('Error fetching divisions:', err);
      }
    };

    fetchDivisions();
  }, [selectedLeague]);

  const handleSubmit = async () => {
    if (!selectedLeague || !selectedDivision || !team) {
      setError('Please select both a league and division');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Check if team is already registered for this league
      const { data: existingRegistrations, error: checkError } = await supabase
        .from('league_registrations')
        .select('id')
        .eq('team_id', team.id)
        .eq('league_id', selectedLeague);

      if (checkError) {
        console.error('Error checking existing registration:', checkError);
        // Continue with registration attempt - let the database constraints handle duplicates
      } else if (existingRegistrations && existingRegistrations.length > 0) {
        throw new Error('Your team is already registered for this league');
      }

      // Register team for league with approved status
      const { error } = await supabase
        .from('league_registrations')
        .insert({
          team_id: team.id,
          league_id: selectedLeague,
          division_id: selectedDivision,
          status: 'approved' // Explicitly set status to approved
        });

      if (error) throw error;

      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/teams');
      }, 2000);

    } catch (err: any) {
      console.error('Error registering for league:', err);
      setError(err.message || 'Failed to register for league');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading leagues...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Trophy className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">Successfully Joined League!</h2>
              <p className="text-muted-foreground mb-4">
                Your team "{team?.name}" has been registered for the league and is ready to compete.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to teams...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Team Not Found</h2>
          <p className="text-muted-foreground mb-4">The team you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/teams')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/teams')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams
            </Button>
            <div>
              <h2 className="text-3xl font-bold">Join League</h2>
              <p className="text-muted-foreground">Join a padel league and start competing</p>
            </div>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Team Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team: {team.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Players:</p>
                  <p className="font-medium">{team.player1?.full_name}</p>
                  <p className="font-medium">{team.player2?.full_name}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Complete Team</Badge>
              </div>
            </CardContent>
          </Card>

          {leagues.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Leagues Available</h3>
                <p className="text-muted-foreground">
                  There are currently no leagues open for registration. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* League Selection */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Select League</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Available Leagues</label>
                    <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a league" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map((league) => (
                          <SelectItem key={league.id} value={league.id}>
                            {league.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedLeague && (
                    <div>
                      <label className="text-sm font-medium">Select Division</label>
                      <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a division" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((division) => (
                            <SelectItem key={division.id} value={division.id}>
                              {division.name} (Level {division.level})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* League Details */}
              {selectedLeague && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>League Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const league = leagues.find(l => l.id === selectedLeague);
                      if (!league) return null;

                      return (
                        <div className="space-y-4">
                          {league.description && (
                            <p className="text-muted-foreground">{league.description}</p>
                          )}

                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>Duration: {new Date(league.start_date).toLocaleDateString()} - {new Date(league.end_date).toLocaleDateString()}</span>
                            </div>
                            {league.max_teams_per_division && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>Max Teams per Division: {league.max_teams_per_division}</span>
                              </div>
                            )}
                            {league.match_format && (
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-muted-foreground" />
                                <span>Match Format: {league.match_format}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge className="w-4 h-4 text-muted-foreground" />
                              <span>Status: {league.status}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/teams')}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-padel text-white"
                  onClick={handleSubmit}
                  disabled={!selectedLeague || !selectedDivision || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 mr-2" />
                      Join League
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinLeague;
