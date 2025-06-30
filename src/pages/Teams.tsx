import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Trophy, Calendar, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

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

useEffect(() => {
  const fetchTeamsAndInvitations = async () => {
    if (!profile) return;

    try {
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

      console.log('Teams data:', teamsData, 'Error:', teamsError); // Debug log

      if (teamsError) throw teamsError;

      // Fetch team registrations for all teams
      const teamIds = teamsData?.map(team => team.id) || [];
      console.log('Team IDs:', teamIds); // Debug log
      
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

        console.log('Registrations data:', regsData, 'Error:', regsError); // Debug log

        if (regsError) throw regsError;
        registrationsData = regsData || [];
      }

      // Add registrations to teams
      const teamsWithRegistrations = teamsData?.map(team => ({
        ...team,
        registrations: registrationsData.filter(reg => reg.team_id === team.id)
      })) || [];

      console.log('Teams with registrations:', teamsWithRegistrations); // Debug log

      // Fetch pending invitations for this user
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
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchTeamsAndInvitations();
}, [profile]);

  const handleInvitationResponse = async (invitationId: string, teamId: string, accept: boolean) => {
    setProcessingInvitation(invitationId);
    
    try {
      console.log('Processing invitation:', { invitationId, teamId, accept, userId: profile?.id });

      if (accept) {
        // Step 1: Update the team to add this user as player2
        const { error: teamError } = await supabase
          .from('teams')
          .update({ player2_id: profile?.id })
          .eq('id', teamId);

        if (teamError) {
          console.error('Team update error:', teamError);
          throw teamError;
        }
        console.log('Team updated successfully');

        // Step 2: Update invitation status
        const { error: inviteError } = await supabase
          .from('team_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationId);

        if (inviteError) {
          console.error('Invitation update error:', inviteError);
          throw inviteError;
        }
        console.log('Invitation updated successfully');

        setMessage('Team invitation accepted! You are now part of the team.');
      } else {
        // Update invitation status to declined
        const { error } = await supabase
          .from('team_invitations')
          .update({ status: 'declined' })
          .eq('id', invitationId);

        if (error) throw error;

        setMessage('Team invitation declined.');
      }

      // Wait a moment to ensure database operations are complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Remove invitation from local state immediately
      setInvitations(prevInvitations => {
        const filtered = prevInvitations.filter(inv => inv.id !== invitationId);
        console.log('Filtered invitations:', filtered);
        return filtered;
      });
      
      // Clear processing state
      setProcessingInvitation(null);

      // If accepted, fetch fresh data instead of reloading
      if (accept) {
        // Fetch fresh teams and invitations
        const { data: teamsData } = await supabase
          .from('teams')
          .select(`
            *,
            player1:profiles!teams_player1_id_fkey(full_name, email),
            player2:profiles!teams_player2_id_fkey(full_name, email)
          `)
          .or(`player1_id.eq.${profile?.id},player2_id.eq.${profile?.id}`)
          .order('created_at', { ascending: false });

        if (teamsData) {
          setTeams(teamsData);
        }
      }

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
      
    } catch (error) {
      console.error('Detailed error responding to invitation:', error);
      setMessage(`Error processing invitation response: ${error.message || error}`);
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
                                    {registration.division?.name} • {registration.status}
                                  </p>
                                </div>
                                <Badge 
                                  variant={
                                    registration.status === 'approved' ? 'default' : 
                                    registration.status === 'pending' ? 'secondary' : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {registration.status}
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
                      {team.created_by === profile?.id && (
                        <Link to={`/manage-team/${team.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Manage Team
                          </Button>
                        </Link>
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
    </div>
  );
};

export default Teams;
