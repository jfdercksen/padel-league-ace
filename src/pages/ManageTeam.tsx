import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Users, 
  Edit3,
  Save,
  X,
  Trash2,
  User,
  Crown,
  Trophy,
  Mail,
  UserPlus,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

interface Team {
  id: string;
  name: string;
  player1_id: string;
  player2_id: string;
  created_by: string;
  created_at: string;
  player1: {
    full_name: string;
    email: string;
  };
  player2: {
    full_name: string;
    email: string;
  };
}

interface TeamRegistration {
  id: string;
  league_id: string;
  division_id: string;
  registered_at: string;
  matches_played: number | null;
  matches_won: number | null;
  points: number | null;
  status: string | null;
  league: {
    name: string;
    start_date: string;
    end_date: string;
  };
  division: {
    name: string;
    level: number;
  };
}

const ManageTeam = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [removingPlayer, setRemovingPlayer] = useState(false);
  
  // Form state
  const [teamName, setTeamName] = useState('');
  const [teammateEmail, setTeammateEmail] = useState('');

  useEffect(() => {
    fetchTeamData();
  }, [teamId, profile]);

  const fetchTeamData = async () => {
    if (!teamId || !profile) return;

    try {
      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          player1:profiles!teams_player1_id_fkey(full_name, email),
          player2:profiles!teams_player2_id_fkey(full_name, email)
        `)
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // Check if user is authorized to manage this team
      if (teamData.created_by !== profile.id && profile.role !== 'super_admin') {
        setError('You are not authorized to manage this team.');
        return;
      }

      setTeam(teamData);
      setTeamName(teamData.name);

      // Fetch team registrations
      const { data: regData, error: regError } = await supabase
        .from('league_registrations')
        .select(`
          *,
          league:leagues(name, start_date, end_date),
          division:divisions(name, level)
        `)
        .eq('team_id', teamId)
        .order('registered_at', { ascending: false });

      console.log('League registrations query result:', { regData, regError, teamId });

      if (regError) throw regError;
      setRegistrations(regData || []);

    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeamName = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: teamName })
        .eq('id', teamId);

      if (error) throw error;

      setSuccess('Team name updated successfully!');
      setEditing(false);
      
      // Update local state
      if (team) {
        setTeam({ ...team, name: teamName });
      }

      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Error updating team name:', error);
      setError('Failed to update team name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    // Check if team has any league registrations
    if (registrations.length > 0) {
      setError('Cannot delete team that is registered for leagues. Please leave all leagues first.');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      navigate('/teams');
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team. Please try again.');
    }
  };

  const handleRemovePlayer2 = async () => {
    if (!team) return;
    
    if (!confirm('Are you sure you want to remove this player from the team? They can be added again later.')) {
      return;
    }

    setRemovingPlayer(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('teams')
        .update({ player2_id: null })
        .eq('id', team.id);

      if (error) throw error;

      setSuccess('Player removed from team successfully!');
      
      // Update local state
      setTeam({
        ...team,
        player2_id: null as any,
        player2: null as any
      });

      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error removing player:', err);
      setError(err.message || 'Failed to remove player from team');
    } finally {
      setRemovingPlayer(false);
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
              <p className="text-lg text-muted-foreground">Loading team details...</p>
            </div>
          </div>
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
          <p className="text-muted-foreground mb-4">The team you're looking for doesn't exist or you don't have permission to manage it.</p>
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
        <div className="max-w-4xl mx-auto">
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
            <div className="flex-1">
              <h2 className="text-3xl font-bold">Manage Team</h2>
              <p className="text-muted-foreground">Manage your team settings and view league registrations</p>
            </div>
            <Badge variant="default">
              Complete Team
            </Badge>
          </div>

          {/* Messages */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="leagues" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Leagues
              </TabsTrigger>
            </TabsList>

            {/* Team Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="teamName">Team Name</Label>
                    {editing ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="teamName"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Enter team name"
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSaveTeamName} 
                          disabled={saving || !teamName.trim()}
                          size="sm"
                        >
                          {saving ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button 
                          onClick={() => {
                            setEditing(false);
                            setTeamName(team.name);
                          }} 
                          variant="outline"
                          size="sm"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-lg font-semibold">{team.name}</p>
                        <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Created</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(team.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Complete (2/2 players)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Player 1 (Captain) */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{team.player1.full_name}</p>
                          <p className="text-sm text-muted-foreground">{team.player1.email}</p>
                        </div>
                        <Crown className="w-4 h-4 text-yellow-500" />
                      </div>
                      <Badge variant="secondary">Captain</Badge>
                    </div>

                    {/* Player 2 */}
                    {team.player2 ? (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{team.player2.full_name}</p>
                            <p className="text-sm text-muted-foreground">{team.player2.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Player</Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                          onClick={() => setIsAddPlayerDialogOpen(true)}
                          title="Change teammate"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          {team.player2_id && team.created_by === profile?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={handleRemovePlayer2}
                              disabled={removingPlayer}
                            >
                              {removingPlayer ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 border rounded-lg border-dashed">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">No second player</p>
                            <p className="text-sm text-muted-foreground">Add a player to join your team</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsAddPlayerDialogOpen(true)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add Player
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Add Player Dialog */}
              <Dialog open={isAddPlayerDialogOpen} onOpenChange={setIsAddPlayerDialogOpen}>
                <DialogContent 
                  className="sm:max-w-[425px]"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle>Add Player</DialogTitle>
                    <DialogDescription>
                      Add an existing player to your team by entering their email address. The player must have an account in the system.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="teammateEmail">Teammate Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="teammateEmail"
                          type="email"
                          value={teammateEmail}
                          onChange={(e) => setTeammateEmail(e.target.value)}
                          placeholder="teammate@example.com"
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add an existing player to your team by entering their email address. The player must have an account in the system.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddPlayerDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={async () => {
                        if (!teammateEmail.trim()) {
                          setError('Teammate email is required');
                          return;
                        }
                        
                        if (teammateEmail === profile?.email) {
                          setError('You cannot add yourself to the team.');
                          return;
                        }
                        
                        setAddingPlayer(true);
                        setError(null);
                        
                        try {
                          if (!team) return;

                          const normalizedEmail = teammateEmail.trim().toLowerCase();

                          // Check if player exists in the system
                          const { data: existingUser, error: lookupError } = await supabase
                            .from('profiles')
                            .select('id, full_name, email')
                            .eq('email', normalizedEmail)
                            .single();

                          if (lookupError || !existingUser) {
                            setError('Player not found. They need to create an account first.');
                            return;
                          }

                          // Check if this player is already on another team or is the current user
                          if (existingUser.id === profile?.id) {
                            setError('You cannot add yourself to the team.');
                            return;
                          }

                          // Add player to team
                          const { error: updateError } = await supabase
                            .from('teams')
                            .update({ player2_id: existingUser.id })
                            .eq('id', team.id);

                          if (updateError) throw updateError;

                          setSuccess(`${existingUser.full_name || existingUser.email} has been added to your team!`);
                          
                          // Update local state
                          setTeam({
                            ...team,
                            player2_id: existingUser.id,
                            player2: {
                              full_name: existingUser.full_name,
                              email: existingUser.email
                            }
                          });

                          setIsAddPlayerDialogOpen(false);
                          setTeammateEmail('');
                          setTimeout(() => setSuccess(null), 3000);

                        } catch (err: any) {
                          console.error('Error adding player:', err);
                          setError(err.message || 'Failed to add player to team');
                        } finally {
                          setAddingPlayer(false);
                        }
                      }}
                      disabled={addingPlayer || !teammateEmail.trim()}
                    >
                      {addingPlayer ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add to Team
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Leagues Tab */}
            <TabsContent value="leagues" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    League Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {registrations.length > 0 ? (
                    <div className="space-y-4">
                      {registrations.map((registration) => (
                        <div key={registration.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{registration.league.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {registration.division.name} • Level {registration.division.level}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(registration.league.start_date).toLocaleDateString()} - {new Date(registration.league.end_date).toLocaleDateString()}
                              </p>
                              {registration.matches_played !== null && (
                                <p className="text-sm text-muted-foreground">
                                  Matches: {registration.matches_won || 0}/{registration.matches_played || 0} • Points: {registration.points || 0}
                                </p>
                              )}
                            </div>
                            <Badge variant={
                              registration.status === 'approved' ? 'default' : 
                              registration.status === 'pending' ? 'secondary' : 
                              'destructive'
                            }>
                              {registration.status === 'approved' ? 'Approved' :
                               registration.status === 'pending' ? 'Pending' :
                               registration.status === 'rejected' ? 'Rejected' : 
                               `Unknown (${registration.status})`}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No League Registrations</h3>
                      <p className="text-muted-foreground mb-4">
                        This team hasn't joined any leagues yet.
                      </p>
                      <Link to={`/join-league/${team.id}`}>
                        <Button variant="outline">
                          Join League
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Delete Team Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Delete Team</h4>
                <p className="text-red-700 text-sm mb-4">
                  Permanently delete this team. This action cannot be undone.
                  {registrations.length > 0 && (
                    <span className="block mt-2 font-medium">
                      ⚠️ Cannot delete team that is registered for leagues.
                    </span>
                  )}
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteTeam}
                  disabled={registrations.length > 0}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManageTeam;
