import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Users, Plus, Trophy, Calendar, Mail, Clock, MapPin, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Team {
  id: string;
  name: string;
  player1_id: string;
  player2_id: string | null;
  created_by: string;
  created_at: string;
  player1?: {
    full_name: string;
    email: string;
  };
  player2?: {
    full_name: string;
    email: string;
  } | null;
  registrations?: any[];
}

interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  status: string;
  created_at: string;
  team: {
    name: string;
    created_by: string;
  };
}

const Teams = () => {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [matchConfirmations, setMatchConfirmations] = useState([]);
  const [loadingConfirmations, setLoadingConfirmations] = useState(true);
  const [processingConfirmation, setProcessingConfirmation] = useState<string | null>(null);
  const [postponeForm, setPostponeForm] = useState({
    matchId: '',
    notes: '',
    showForm: false
  });

  useEffect(() => {
    console.log('Invitations state changed:', invitations);
  }, [invitations]);

  useEffect(() => {
    const fetchTeamsAndInvitations = async () => {
      if (!profile) return;

      try {
        if (profile.role === 'league_admin') {
          // League Admin: Show teams registered for their leagues

          // First, get leagues created by this admin
          const { data: adminLeagues, error: leaguesError } = await supabase
            .from('leagues')
            .select('id, name')
            .eq('created_by', profile.id);

          if (leaguesError) throw leaguesError;

          const leagueIds = adminLeagues?.map(league => league.id) || [];

          if (leagueIds.length > 0) {
            // Get all team registrations for admin's leagues
            const { data: registrationsData, error: regsError } = await supabase
              .from('league_registrations')
              .select(`
              *,
              team:teams(
                id,
                name,
                player1_id,
                player2_id,
                created_by,
                created_at,
                player1:profiles!teams_player1_id_fkey(full_name, email),
                player2:profiles!teams_player2_id_fkey(full_name, email)
              ),
              league:leagues(name),
              division:divisions(name, level)
            `)
              .in('league_id', leagueIds)
              .order('registered_at', { ascending: false });

            if (regsError) throw regsError;

            // Transform the data to match the existing team structure
            const teamsWithRegistrations = registrationsData?.map(reg => ({
              ...reg.team,
              created_by: reg.team.created_by,
              created_at: reg.team.created_at,
              registrations: [{
                id: reg.id,
                league: reg.league,
                division: reg.division,
                status: reg.status,
                registered_at: reg.registered_at
              }]
            })) || [];

            setTeams(teamsWithRegistrations);
          } else {
            setTeams([]);
          }

          // No invitations for league admins
          setInvitations([]);

        } else {
          // Player: Existing logic (keep as is)

          // Fetch teams where user is a member
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select(`
            *,
            player1:profiles!teams_player1_id_fkey(full_name, email),
            player2:profiles!teams_player2_id_fkey(full_name, email)
          `)
            .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
            .order('created_at', { ascending: false });

          console.log('Teams data:', teamsData, 'Error:', teamsError);

          if (teamsError) throw teamsError;

          // Fetch team registrations for all teams
          const teamIds = teamsData?.map(team => team.id) || [];
          console.log('Team IDs:', teamIds);

          let registrationsData = [];

          if (teamIds.length > 0) {
            const { data: regsData, error: regsError } = await supabase
              .from('league_registrations')
              .select(`
              *,
              league:leagues(name, start_date, end_date),
              division:divisions(name, level)
            `)
              .in('team_id', teamIds)
              .order('registered_at', { ascending: false });

            console.log('Registrations data:', regsData, 'Error:', regsError);

            if (regsError) throw regsError;
            registrationsData = regsData || [];
          }

          // Add registrations to teams
          const teamsWithRegistrations = teamsData?.map(team => ({
            ...team,
            registrations: registrationsData.filter(reg => reg.team_id === team.id)
          })) || [];

          console.log('Teams with registrations:', teamsWithRegistrations);

          // Fetch pending invitations for players
          const { data: invitationsData, error: invitationsError } = await supabase
            .from('team_invitations')
            .select(`
            *,
            team:teams(name, created_by)
          `)
            .eq('email', profile.email)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (invitationsError) throw invitationsError;

          setTeams(teamsWithRegistrations);
          setInvitations(invitationsData || []);
        }

      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsAndInvitations();
  }, [profile]);

  useEffect(() => {
    const fetchMatchConfirmations = async () => {
      if (!profile) return;

      try {
        setLoadingConfirmations(true);

        // Get all teams where user is a member
        const userTeamIds = teams.map(team => team.id);

        // DEBUG: Log the teams
        console.log('Teams page - Teams state:', teams);
        console.log('Teams page - User team IDs:', userTeamIds);

        if (userTeamIds.length === 0) {
          setMatchConfirmations([]);
          return;
        }

        // Fetch match confirmations for user's teams
        const { data, error } = await (supabase as any)
          .from('match_confirmations')
          .select(`
              *,
              match:matches(
                id,
                scheduled_date,
                scheduled_time,
                venue,
                team1:teams!matches_team1_id_fkey(id, name),
                team2:teams!matches_team2_id_fkey(id, name),
                league:leagues(name),
                division:divisions(name)
              )
            `);

        const filteredData = data
          ? data.filter((item: any) =>
            userTeamIds.includes(item.team_id) && item.status === 'pending'
          )
          : [];

        if (error) throw error;
        setMatchConfirmations(filteredData);

      } catch (error) {
        console.error('Error fetching match confirmations:', error);
      } finally {
        setLoadingConfirmations(false);
      }
    };

    if (teams.length > 0) {
      fetchMatchConfirmations();
    }
  }, [teams, profile]);


  const handleInvitationResponse = async (invitationId: string, teamId: string, accept: boolean) => {
    setProcessingInvitation(invitationId);

    try {
      console.log('=== DEBUGGING INVITATION ===');
      console.log('Invitation ID:', invitationId);
      console.log('Team ID:', teamId);
      console.log('User email:', profile?.email);

      // STEP 1: Check current invitation status BEFORE update
      const { data: beforeUpdate, error: beforeError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      console.log('Invitation BEFORE update:', beforeUpdate);
      if (beforeError) console.error('Error fetching before:', beforeError);

      if (accept) {
        // Update the team
        const { error: teamError } = await supabase
          .from('teams')
          .update({ player2_id: profile?.id })
          .eq('id', teamId);

        if (teamError) {
          console.error('Team update error:', teamError);
          throw teamError;
        }
        console.log('✅ Team updated successfully');

        // Update invitation status
        const { data: updateResult, error: inviteError } = await supabase
          .from('team_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationId)
          .select(); // Add .select() to see what was updated

        console.log('Update result:', updateResult);
        if (inviteError) {
          console.error('Invitation update error:', inviteError);
          throw inviteError;
        }
        console.log('✅ Invitation updated successfully');

        // STEP 2: Check invitation status AFTER update
        const { data: afterUpdate, error: afterError } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('id', invitationId)
          .single();

        console.log('Invitation AFTER update:', afterUpdate);
        if (afterError) console.error('Error fetching after:', afterError);

        // STEP 3: Check ALL invitations for this user
        const { data: allInvitations, error: allError } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('email', profile?.email);

        console.log('ALL invitations for user:', allInvitations);
        if (allError) console.error('Error fetching all:', allError);

        setMessage('Team invitation accepted! You are now part of the team.');
      } else {
        // Handle decline...
        const { error } = await supabase
          .from('team_invitations')
          .update({ status: 'declined' })
          .eq('id', invitationId);

        if (error) throw error;
        setMessage('Team invitation declined.');
      }

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      // Refresh data
      setTimeout(() => {
        // Force refresh the page data
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error processing invitation:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setProcessingInvitation(null);
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
              <p className="text-lg text-muted-foreground">Loading teams...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleConfirmationResponse = async (confirmationId: string, response: 'accepted' | 'postpone_requested', notes?: string) => {
    setProcessingConfirmation(confirmationId);

    try {
      const updateData: any = {
        status: response,
        responded_at: new Date().toISOString()
      };

      if (notes) {
        updateData.response_notes = notes;
      }

      const { data, error } = await (supabase as any)
        .from('match_confirmations')
        .update(updateData)
        .eq('id', confirmationId);

      if (error) throw error;

      // Remove from pending confirmations
      setMatchConfirmations(prev =>
        prev.filter(conf => conf.id !== confirmationId)
      );

      setMessage(
        response === 'accepted'
          ? 'Match time accepted! You\'re all set to play.'
          : 'Postponement request sent to league administrator.'
      );

      // Reset postpone form
      setPostponeForm({ matchId: '', notes: '', showForm: false });

      setTimeout(() => setMessage(null), 5000);

    } catch (error) {
      console.error('Error responding to confirmation:', error);
      setMessage('Error processing response. Please try again.');
    } finally {
      setProcessingConfirmation(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      <Header />

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">My Teams</h2>
              <p className="text-muted-foreground">
                Manage your padel teams and partnerships
              </p>
            </div>
            {profile?.role === 'player' && (
              <Link to="/create-team">
                <Button className="gradient-padel text-white flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Team
                </Button>
              </Link>
            )}
          </div>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.includes('Error') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={message.includes('Error') ? 'text-red-700' : 'text-green-700'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Team Invitations</h3>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">Team Invitation</h4>
                        <p className="text-sm text-muted-foreground">
                          You've been invited to join "<strong>{invitation.team.name}</strong>"
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInvitationResponse(invitation.id, invitation.team_id, false)}
                          disabled={processingInvitation === invitation.id}
                        >
                          {processingInvitation === invitation.id ? 'Processing...' : 'Decline'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleInvitationResponse(invitation.id, invitation.team_id, true)}
                          disabled={processingInvitation === invitation.id}
                        >
                          {processingInvitation === invitation.id ? 'Processing...' : 'Accept'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Teams Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.length > 0 ? (
            teams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {team.name}
                  </CardTitle>
                  {team.created_by === profile?.id && (
                    <Badge variant="secondary" className="w-fit">Team Captain</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Team Members:</p>
                      <div className="space-y-1">
                        <p className="font-medium">{team.player1?.full_name}</p>
                        {team.player2 ? (
                          <p className="font-medium">{team.player2.full_name}</p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Invitation pending...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Status:</p>
                      <Badge variant={team.player2 ? "default" : "outline"}>
                        {team.player2 ? "Complete" : "Waiting for Partner"}
                      </Badge>
                    </div>


                    {team.registrations && team.registrations.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">League Registrations:</p>
                        <div className="space-y-1">
                          {team.registrations.map((registration: any) => (
                            <div key={registration.id} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{registration.league?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {registration.division?.name}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  registration.status === 'approved' ? 'default' :
                                    registration.status === 'pending' ? 'secondary' : 'destructive'
                                }
                                className="text-xs"
                              >
                                {registration.status === 'pending' ? 'Waiting for approval' : registration.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    <div className="pt-2 space-y-2">
                      <Link to={`/join-league/${team.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={!team.player2} // Disable if team is incomplete
                          onClick={() => console.log('Join League button clicked for team:', team.id, 'Has player2:', !!team.player2)}
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          {team.player2 ? 'Join League' : 'Need Partner'}
                        </Button>
                      </Link>
                      {team.created_by === profile?.id ? (
                        <>
                          <Link to={`/manage-team/${team.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              Manage Team
                            </Button>
                          </Link>

                          {/* Team captain actions */}
                          {team.player2 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-amber-600 hover:bg-amber-50 mt-2"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove ${team.player2?.full_name} from the team?`)) {
                                  supabase
                                    .from('teams')
                                    .update({ player2_id: null })
                                    .eq('id', team.id)
                                    .then(({ error }) => {
                                      if (error) {
                                        console.error('Error removing player:', error);
                                        setMessage('Error: Failed to remove player. Please try again.');
                                      } else {
                                        setMessage(`Player removed from team "${team.name}".`);
                                        // Update team in local state
                                        setTeams(prev => prev.map(t =>
                                          t.id === team.id ? { ...t, player2: null, player2_id: null } : t
                                        ));
                                      }
                                    });
                                }
                              }}
                            >
                              Remove Player
                            </Button>
                          )}

                          {/* Delete team button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive hover:bg-destructive/10 mt-2"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`)) {
                                // Check if team has any league registrations
                                const hasRegistrations = team.registrations && team.registrations.length > 0;

                                if (hasRegistrations) {
                                  setMessage('Error: Cannot delete team that is registered for leagues. Please leave all leagues first.');
                                  return;
                                }

                                // First, check if there are any team invitations
                                setMessage('Deleting team...');

                                // Step 1: Delete any team invitations
                                supabase
                                  .from('team_invitations')
                                  .delete()
                                  .eq('team_id', team.id)
                                  .then(({ error: invitationError }) => {
                                    if (invitationError) {
                                      console.error('Error deleting team invitations:', invitationError);
                                      // Continue with team deletion even if invitation deletion fails
                                    }

                                    console.log('Team invitations deleted or none existed');

                                    // Step 2: Delete any match confirmations
                                    return supabase
                                      .from('match_confirmations')
                                      .delete()
                                      .eq('team_id', team.id);
                                  })
                                  .then(({ error: confirmationError }) => {
                                    if (confirmationError) {
                                      console.error('Error deleting match confirmations:', confirmationError);
                                      // Continue with team deletion even if confirmation deletion fails
                                    }

                                    console.log('Match confirmations deleted or none existed');

                                    // Step 3: Check for league registrations first
                                    return supabase
                                      .from('league_registrations')
                                      .delete()
                                      .eq('team_id', team.id);
                                  })
                                  .then(({ error: regError }) => {
                                    if (regError) {
                                      console.error('Error deleting league registrations:', regError);
                                      // Continue with team deletion even if registration deletion fails
                                    }

                                    console.log('League registrations deleted or none existed');

                                    // Step 4: Delete the team
                                    return supabase
                                      .from('teams')
                                      .delete()
                                      .eq('id', team.id);
                                  })
                                  .then(({ error, data }) => {
                                    if (error) {
                                      console.error('Error deleting team:', error);
                                      setMessage('Error: Failed to delete team. Please try again.');
                                    } else {
                                      console.log('Team deleted successfully:', data);
                                      setMessage(`Team "${team.name}" has been deleted.`);
                                      // Remove team from local state
                                      setTeams(prev => prev.filter(t => t.id !== team.id));

                                      // No need to reload the page, the team is already removed from state
                                    }
                                  }, (err) => {
                                    // This is the error handler for the last promise in the chain
                                    console.error('Unexpected error during team deletion:', err);
                                    setMessage('Error: An unexpected error occurred. Please try again.');
                                  });
                              }
                            }}
                          >
                            Delete Team
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to leave the team "${team.name}"?`)) {
                              // Determine if user is player1 or player2
                              const isPlayer1 = team.player1_id === profile?.id;
                              const isPlayer2 = team.player2_id === profile?.id;

                              if (isPlayer2) {
                                // If user is player2, just remove them from the team
                                supabase
                                  .from('teams')
                                  .update({ player2_id: null })
                                  .eq('id', team.id)
                                  .then(({ error }) => {
                                    if (error) {
                                      console.error('Error leaving team:', error);
                                      setMessage('Error: Failed to leave team. Please try again.');
                                    } else {
                                      setMessage(`You have left the team "${team.name}".`);
                                      // Remove team from local state
                                      setTeams(prev => prev.filter(t => t.id !== team.id));
                                    }
                                  });
                              } else if (isPlayer1) {
                                // If user is player1 (but not captain), this is more complex
                                // We need to swap player1 and player2, then remove player2
                                supabase
                                  .from('teams')
                                  .update({
                                    player1_id: team.player2_id,
                                    player2_id: null
                                  })
                                  .eq('id', team.id)
                                  .then(({ error }) => {
                                    if (error) {
                                      console.error('Error leaving team:', error);
                                      setMessage('Error: Failed to leave team. Please try again.');
                                    } else {
                                      setMessage(`You have left the team "${team.name}".`);
                                      // Remove team from local state
                                      setTeams(prev => prev.filter(t => t.id !== team.id));
                                    }
                                  });
                              }
                            }
                          }}
                        >
                          Leave Team
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-2 col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first padel team to start competing in leagues
                </p>
                {profile?.role === 'player' && (
                  <Link to="/create-team">
                    <Button className="gradient-padel text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Team
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* League Registration Coming Soon */}
        {teams.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  League Registration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">League Registration Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Register your teams for leagues and get assigned to divisions based on skill level.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      {/* Add this section before the final closing </div> in the main content area */}

      {/* Match Confirmations Section */}
      {matchConfirmations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Pending Match Confirmations ({matchConfirmations.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Please confirm or request changes for these scheduled matches
            </p>
          </CardHeader>
          <CardContent>
            {/* Copy the rest of the JSX from the artifact above */}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Teams;
