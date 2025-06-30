import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Trophy, 
  Settings,
  Save,
  X,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

interface League {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  match_format: string | null;
  max_teams_per_division: number | null;
}

interface TeamRegistration {
  id: string;
  team_id: string;
  league_id: string;
  division_id: string;
  status: string | null;
  registered_at: string | null;
  matches_played: number | null;
  matches_won: number | null;
  points: number | null;
  team: {
    id: string;
    name: string;
    player1_id: string;
    player2_id: string | null;
    player1: {
      full_name: string;
      email: string;
    };
    player2?: {
      full_name: string;
      email: string;
    } | null;
  };
  division: {
    name: string;
    level: number;
  };
}

const ManageLeague = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Team registration states
  const [teamRegistrations, setTeamRegistrations] = useState<TeamRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);
  const [processingRegistration, setProcessingRegistration] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: '',
    venue: '',
    max_teams: '',
    registration_deadline: ''
  });

  useEffect(() => {
    fetchLeagueData();
  }, [leagueId, profile]);

  useEffect(() => {
    if (leagueId) {
      fetchTeamRegistrations();
    }
  }, [leagueId]);

  const fetchLeagueData = async () => {
    if (!leagueId || !profile) return;

    try {
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (leagueError) throw leagueError;

      // Check if user is authorized to manage this league
      if (leagueData.created_by !== profile.id && profile.role !== 'super_admin') {
        setError('You are not authorized to manage this league.');
        return;
      }

      setLeague(leagueData);
      setFormData({
        name: leagueData.name || '',
        description: leagueData.description || '',
        start_date: leagueData.start_date || '',
        end_date: leagueData.end_date || '',
        status: leagueData.status || 'draft',
        venue: '', // Not in current schema
        max_teams: leagueData.max_teams_per_division?.toString() || '',
        registration_deadline: '' // Not in current schema
      });

    } catch (error) {
      console.error('Error fetching league data:', error);
      setError('Failed to load league data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamRegistrations = async () => {
  if (!leagueId) return;
  
  console.log('Fetching registrations for league:', leagueId); // Add this
  
      setLoadingRegistrations(true);
      try {
        const { data, error } = await supabase
          .from('league_registrations')
          .select(`
            *,
            team:teams (
              id,
              name,
              player1_id,
              player2_id,
              player1:profiles!teams_player1_id_fkey(full_name, email),
              player2:profiles!teams_player2_id_fkey(full_name, email)
            ),
            division:divisions (name, level)
          `)
          .eq('league_id', leagueId)
          .order('registered_at', { ascending: false });

        console.log('Registration query result:', { data, error }); // Add this

        if (error) throw error;
        setTeamRegistrations(data || []);
      } catch (error) {
        console.error('Error fetching team registrations:', error);
      } finally {
        setLoadingRegistrations(false);
      }
    };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: any = {
        name: formData.name,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        venue: formData.venue || null,
        max_teams: formData.max_teams ? parseInt(formData.max_teams) : null,
        registration_deadline: formData.registration_deadline || null
      };

      const { error } = await supabase
        .from('leagues')
        .update(updateData)
        .eq('id', leagueId);

      if (error) throw error;

      setSuccess('League updated successfully!');
      
      // Refresh league data
      await fetchLeagueData();

      // Clear message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Error updating league:', error);
      setError('Failed to update league. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegistrationAction = async (registrationId: string, action: 'approve' | 'reject') => {
    setProcessingRegistration(registrationId);
    
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from('league_registrations')
        .update({ status: newStatus })
        .eq('id', registrationId);

      if (error) throw error;

      setTeamRegistrations(prev => 
        prev.map(reg => 
          reg.id === registrationId 
            ? { ...reg, status: newStatus as 'approved' | 'rejected' }
            : reg
        )
      );

      setRegistrationMessage(
        action === 'approve' 
          ? 'Team registration approved successfully!' 
          : 'Team registration rejected.'
      );

      setTimeout(() => setRegistrationMessage(null), 3000);

    } catch (error) {
      console.error('Error updating registration:', error);
      setRegistrationMessage('Failed to update registration. Please try again.');
    } finally {
      setProcessingRegistration(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this league? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId);

      if (error) throw error;

      navigate('/leagues');
    } catch (err: any) {
      console.error('Error deleting league:', err);
      setError('Failed to delete league');
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
              <p className="text-lg text-muted-foreground">Loading league details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">League Not Found</h2>
          <p className="text-muted-foreground mb-4">The league you're looking for doesn't exist or you don't have permission to manage it.</p>
          <Button onClick={() => navigate('/leagues')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leagues
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
              onClick={() => navigate('/leagues')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leagues
            </Button>
            <div className="flex-1">
              <h2 className="text-3xl font-bold">Manage League</h2>
              <p className="text-muted-foreground">Update league settings and monitor progress</p>
            </div>
            <Badge className={`${
                formData.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                formData.status === 'registration_open' ? 'bg-green-100 text-green-800' :
                formData.status === 'active' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
                }`}>
                {formData.status === 'registration_open' ? 'Open for Registration' : 
                formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="matches" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Matches
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* League Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>League Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">League Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter league name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => handleInputChange('status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="registration_open">Open for Registration</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="League description..."
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">End Date *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="venue">Venue</Label>
                      <Input
                        id="venue"
                        value={formData.venue}
                        onChange={(e) => handleInputChange('venue', e.target.value)}
                        placeholder="Venue location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_teams">Max Teams</Label>
                      <Input
                        id="max_teams"
                        type="number"
                        value={formData.max_teams}
                        onChange={(e) => handleInputChange('max_teams', e.target.value)}
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="registration_deadline">Registration Deadline</Label>
                    <Input
                      id="registration_deadline"
                      type="date"
                      value={formData.registration_deadline}
                      onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleSave} 
                      disabled={saving || !formData.name}
                      className="flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-6">
              {registrationMessage && (
                <Alert className={`${registrationMessage.includes('Failed') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                  <AlertDescription className={registrationMessage.includes('Failed') ? 'text-red-700' : 'text-green-700'}>
                    {registrationMessage}
                  </AlertDescription>
                </Alert>
              )}

              {loadingRegistrations ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading team registrations...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Pending Registrations */}
                  {teamRegistrations.filter(reg => reg.status === 'pending').length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-yellow-500" />
                          Pending Registrations ({teamRegistrations.filter(reg => reg.status === 'pending').length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {teamRegistrations
                            .filter(reg => reg.status === 'pending')
                            .map((registration) => (
                              <div key={registration.id} className="border rounded-lg p-4 bg-yellow-50">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Users className="w-4 h-4 text-primary" />
                                      <h4 className="font-semibold">{registration.team.name}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        {registration.division.name}
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid md:grid-cols-2 gap-3">
                                      <div className="flex items-center gap-2">
                                        <User className="w-3 h-3 text-muted-foreground" />
                                        <div>
                                          <p className="text-sm font-medium">{registration.team.player1.full_name}</p>
                                          <p className="text-xs text-muted-foreground">{registration.team.player1.email}</p>
                                        </div>
                                      </div>
                                      
                                      {registration.team.player2 ? (
                                        <div className="flex items-center gap-2">
                                          <User className="w-3 h-3 text-muted-foreground" />
                                          <div>
                                            <p className="text-sm font-medium">{registration.team.player2.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{registration.team.player2.email}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <Mail className="w-3 h-3 text-muted-foreground" />
                                          <p className="text-sm text-muted-foreground">Waiting for partner...</p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Registered: {new Date(registration.registered_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  
                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRegistrationAction(registration.id, 'reject')}
                                      disabled={processingRegistration === registration.id || !registration.team.player2}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      {processingRegistration === registration.id ? (
                                        <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                      ) : (
                                        <XCircle className="w-3 h-3 mr-1" />
                                      )}
                                      Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleRegistrationAction(registration.id, 'approve')}
                                      disabled={processingRegistration === registration.id || !registration.team.player2}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      {processingRegistration === registration.id ? (
                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                      ) : (
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                      )}
                                      Approve
                                    </Button>
                                  </div>
                                </div>
                                
                                {!registration.team.player2 && (
                                  <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-700">
                                    ⚠️ Team is incomplete - waiting for second player to accept invitation
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Approved Teams */}
                  {teamRegistrations.filter(reg => reg.status === 'approved').length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          Approved Teams ({teamRegistrations.filter(reg => reg.status === 'approved').length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          {teamRegistrations
                            .filter(reg => reg.status === 'approved')
                            .map((registration) => (
                              <div key={registration.id} className="border rounded-lg p-4 bg-green-50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-primary" />
                                  <h4 className="font-semibold">{registration.team.name}</h4>
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    {registration.division.name}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-sm">{registration.team.player1.full_name}</p>
                                  </div>
                                  
                                  {registration.team.player2 && (
                                    <div className="flex items-center gap-2">
                                      <User className="w-3 h-3 text-muted-foreground" />
                                      <p className="text-sm">{registration.team.player2.full_name}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <p className="text-xs text-muted-foreground mt-2">
                                  Approved: {new Date(registration.registered_at).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Rejected Teams */}
                  {teamRegistrations.filter(reg => reg.status === 'rejected').length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-500" />
                          Rejected Registrations ({teamRegistrations.filter(reg => reg.status === 'rejected').length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {teamRegistrations
                            .filter(reg => reg.status === 'rejected')
                            .map((registration) => (
                              <div key={registration.id} className="border rounded-lg p-3 bg-red-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-sm">{registration.team.name}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {registration.team.player1.full_name}
                                      {registration.team.player2 && ` & ${registration.team.player2.full_name}`}
                                    </p>
                                  </div>
                                  <Badge variant="destructive" className="text-xs">
                                    Rejected
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* No Registrations */}
                  {teamRegistrations.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Team Registrations Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Teams will appear here once they register for this league.
                        </p>
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          💡 Make sure your league status is "Open for Registration" to allow teams to join
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Matches Tab */}
            <TabsContent value="matches">
              <Card>
                <CardHeader>
                  <CardTitle>Match Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Matches Coming Soon</h3>
                    <p className="text-muted-foreground">
                      Match scheduling and results tracking will be available here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">Delete League</h4>
                    <p className="text-red-700 text-sm mb-4">
                      Permanently delete this league. This action cannot be undone.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete League
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ManageLeague;
