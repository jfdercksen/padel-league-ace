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
  User,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { generateRoundRobinMatches, clearAllMatches } from '@/utils/matchGenerator';
import ScoreRecordingModal from '@/components/ScoreRecordingModal';



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
  status: string | null; // Change this line
  registered_at: string | null; // Change this line
  matches_played: number | null; // Add this line
  matches_won: number | null; // Add this line  
  points: number | null; // Add this line
  team: {
    id: string;
    name: string;
    player1_id: string;
    player2_id: string | null;
    player1: {
      full_name: string;
      email: string;
    };
    player2: {
      full_name: string;
      email: string;
    } | null;
  };
  division: {
    name: string;
    level: number;
  };
}

interface Division {
  id: string;
  league_id: string;
  name: string;
  level: number;
  max_teams: number;
  created_at: string;
}

interface Match {
  id: string;
  league_id: string;
  division_id: string;
  team1_id: string;
  team2_id: string;
  round_number: number;
  match_number: number;
  scheduled_date: string | null;
  scheduled_time: string | null;
  venue: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  team1?: {
    name: string;
  };
  team2?: {
    name: string;
  };
    division?: {
      name: string;
      level: number;
    };
  }

interface MatchConfirmation {
  id?: string;
  match_id: string;
  team_id: string;
  status: string;
  response_notes?: string;
  responded_at?: string;
  created_at?: string;
};

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
  
  // Fixture generation states
  const [adminMatches, setAdminMatches] = useState<any[]>([]);
  const [pendingConfirmationsAdmin, setPendingConfirmationsAdmin] = useState<any[]>([]);
  const [upcomingMatchesAdmin, setUpcomingMatchesAdmin] = useState<any[]>([]);
  const [completedMatchesAdmin, setCompletedMatchesAdmin] = useState<any[]>([]);
  const [registeredTeams, setRegisteredTeams] = useState<TeamRegistration[]>([]);
  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const [isGeneratingFixtures, setIsGeneratingFixtures] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [isClearingMatches, setIsClearingMatches] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    matchId: '',
    date: '',
    time: '',
    venue: ''
  });
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedMatchForScoring, setSelectedMatchForScoring] = useState<any>(null);
  
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
}, [leagueId, profile?.id]);

useEffect(() => {
  if (leagueId) {
    fetchTeamRegistrations();
    fetchDivisions();
    fetchRegisteredTeams();
    fetchFixtures();
    fetchAdminMatches();
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

  setLoadingRegistrations(true);
      try {
        const { data, error } = await supabase
          .from('league_registrations')  // Changed back
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
        if (error) throw error;
        setTeamRegistrations(data || []);
      } catch (error) {
        console.error('Error fetching team registrations:', error);
      } finally {
        setLoadingRegistrations(false);
      }
    };

  const fetchDivisions = async () => {
    if (!leagueId) return;

    try {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .eq('league_id', leagueId)
        .order('level');

      if (error) throw error;
      setDivisions(data || []);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchRegisteredTeams = async () => {
  if (!leagueId) return;

      try {
        const { data, error } = await supabase
          .from('league_registrations')
          .select(`
            *,
            team:teams(
              id,
              name,
              player1_id,
              player2_id,
              player1:profiles!teams_player1_id_fkey(full_name, email),
              player2:profiles!teams_player2_id_fkey(full_name, email)
            ),
            division:divisions(name, level)
          `)
          .eq('league_id', leagueId)
          .order('registered_at', { ascending: false });

        if (error) throw error;
        setRegisteredTeams(data || []);
      } catch (error) {
        console.error('Error fetching registered teams:', error);
      }
    };

  const fetchFixtures = async () => {
    if (!leagueId) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(name),
          team2:teams!matches_team2_id_fkey(name),
          division:divisions(name, level)
        `)
        .eq('league_id', leagueId)
        .order('match_number');

      if (error) throw error;
      setFixtures(
        (data || []).map((item: any) => ({
          id: item.id,
          league_id: item.league_id,
          division_id: item.division_id,
          team1_id: item.team1_id,
          team2_id: item.team2_id,
          round_number: item.round_number ?? 0,
          match_number: item.match_number ?? 0,
          scheduled_date: item.scheduled_date ?? null,
          scheduled_time: item.scheduled_time ?? null,
          venue: item.venue ?? null,
          status: item.status,
          created_by: item.created_by ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          team1: item.team1,
          team2: item.team2,
          division: item.division,
        }))
      );
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    }
  };

  const handleGenerateFixtures = async () => {
    if (!leagueId) return;
    
    setIsGeneratingFixtures(true);
    try {
      const result = await generateRoundRobinMatches(leagueId);
      
      if (result.success) {
        await fetchFixtures(); // Refresh the fixtures
        setRegistrationMessage(`Generated ${result.matchesGenerated} fixtures across ${result.divisions} divisions`);
      } else {
        setRegistrationMessage(result.error || 'Failed to generate fixtures');
      }
    } catch (error) {
      setRegistrationMessage('Error generating fixtures');
    } finally {
      setIsGeneratingFixtures(false);
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
        .from('league_registrations')  // Changed back
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

  const generateFixtures = async (divisionId: string) => {
    setGeneratingFixtures(true);
    try {
      const { data, error } = await (supabase as any).rpc('generate_round_robin_fixtures', {
        p_league_id: leagueId,
        p_division_id: divisionId,
        p_created_by: profile?.id
      });

      if (error) throw error;

      setSuccess(`${data?.[0]?.message || 'Fixtures generated successfully!'}`);
      
      // Refresh fixtures and registered teams
      await fetchFixtures();
      await fetchRegisteredTeams();

    } catch (error) {
      console.error('Error generating fixtures:', error);
      setError('Failed to generate fixtures: ' + (error as Error).message);
    } finally {
      setGeneratingFixtures(false);
    }
  };

  // Add this function to handle match scheduling
  const handleScheduleMatch = async (matchId: string) => {
    if (!scheduleForm.date || !scheduleForm.time) {
      setError('Please provide both date and time for the match.');
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          scheduled_date: scheduleForm.date,
          scheduled_time: scheduleForm.time,
          venue: scheduleForm.venue || null,
          status: 'confirmed'
        })
        .eq('id', matchId);

      if (error) throw error;

      setSuccess('Match scheduled successfully!');
      setSchedulingMatch(null);
      setScheduleForm({ matchId: '', date: '', time: '', venue: '' });
      
      // Refresh fixtures
      await fetchFixtures();
      
      //Create match confirmations for both teams
      const match = fixtures.find(f => f.id === matchId);
      if (match) {
        await createMatchConfirmations(matchId, match.team1_id, match.team2_id);
      }

      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Error scheduling match:', error);
      setError('Failed to schedule match. Please try again.');
    }
  };

  const handleGenerateMatches = async () => {
    if (!leagueId) return;
    
    setIsGeneratingMatches(true);
    try {
      const result = await generateRoundRobinMatches(leagueId);
      
      if (result.success) {
        // Show success message (you can use your existing toast system)
        console.log(`Generated ${result.matchesGenerated} matches across ${result.divisions} divisions`);
      } else {
        console.error('Failed to generate matches:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsGeneratingMatches(false);
    }
  };

// Add this function to create match confirmations
 const createMatchConfirmations = async (matchId: string, team1Id: string, team2Id: string) => {
    try {
      const confirmations: MatchConfirmation[] = [
        { match_id: matchId, team_id: team1Id, status: 'pending' },
        { match_id: matchId, team_id: team2Id, status: 'pending' }
      ];

      const { error } = await (supabase as any)
        .from('match_confirmations')
        .upsert(confirmations);

      if (error) throw error;
      console.log('Match confirmations created successfully');
    } catch (error) {
      console.error('Error creating match confirmations:', error);
      // Don't throw error - scheduling should still work even if confirmations fail
    }
  };

  const handleClearMatches = async () => {
      if (!leagueId) return;
      
      const confirmed = window.confirm('Are you sure you want to delete ALL matches? This cannot be undone.');
      if (!confirmed) return;
      
      setIsClearingMatches(true);
      try {
        const result = await clearAllMatches(leagueId);
        
        if (result.success) {
          await fetchFixtures(); // Refresh the fixtures
          setRegistrationMessage('All matches cleared successfully');
        } else {
          setRegistrationMessage(result.error || 'Failed to clear matches');
        }
      } catch (error) {
        setRegistrationMessage('Error clearing matches');
      } finally {
        setIsClearingMatches(false);
      }
    };

  const fetchAdminMatches = async () => {
    if (!leagueId) return;
    
    try {
      // Get all matches for this league
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          venue,
          status,
          team1_score,
          team2_score,
          winner_team_id,
          team1_id,
          team2_id,
          team1:teams!matches_team1_id_fkey(name),
          team2:teams!matches_team2_id_fkey(name),
          division:divisions(name),
          league:leagues(name)
        `)
        .eq('league_id', leagueId)
        .order('scheduled_date', { ascending: true });

      if (matchesError) throw matchesError;
    
    // Rest of your function stays the same...
      // Get pending confirmations for this league
      const supabaseAny = supabase as any;
      const { data: confirmations, error: confirmError } = await supabaseAny
        .from('match_confirmations')
        .select(`
          id,
          match_id,
          team_id,
          status,
          reschedule_reason,
          match:matches!inner (
            id,
            scheduled_date,
            scheduled_time,
            venue,
            league_id,
            team1:teams!matches_team1_id_fkey(name),
            team2:teams!matches_team2_id_fkey(name),
            division:divisions(name)
          ),
          team:teams(name)
        `)
        .eq('match.league_id', leagueId)
        .neq('status', 'confirmed');

      if (confirmError) throw confirmError;

      // Categorize matches
      const allMatchesData = matches || [];
      const upcoming = allMatchesData.filter(match => 
        match.status === 'confirmed' && !match.team1_score && !match.team2_score
      );
      const completed = allMatchesData.filter(match => 
        match.status === 'completed' || match.team1_score !== null || match.team2_score !== null
      );

      setAdminMatches(allMatchesData);
      setUpcomingMatchesAdmin(upcoming);
      setCompletedMatchesAdmin(completed);
      setPendingConfirmationsAdmin(confirmations || []);
      
    } catch (error) {
      console.error('Error fetching admin matches:', error);
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
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-none lg:max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/leagues')}
              className="w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Leagues</span>
              <span className="sm:hidden">Back</span>
            </Button>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold truncate">Manage League</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Update league settings and monitor progress
              </p>
            </div>
            
            <Badge className={`text-xs sm:text-sm whitespace-nowrap ${
              formData.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              formData.status === 'registration_open' ? 'bg-green-100 text-green-800' :
              formData.status === 'active' ? 'bg-blue-100 text-blue-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              <span className="hidden sm:inline">
                {formData.status === 'registration_open' ? 'Open for Registration' : 
                formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
              </span>
              <span className="sm:hidden">
                {formData.status === 'registration_open' ? 'Open' : 
                formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
              </span>
            </Badge>
          </div>
        </div>
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
    <CardTitle className="text-lg sm:text-xl">League Information</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="name" className="text-sm font-medium">League Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter league name"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="status" className="text-sm font-medium">Status</Label>
        <Select 
          value={formData.status} 
          onValueChange={(value) => handleInputChange('status', value)}
        >
          <SelectTrigger className="mt-1">
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
      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
      <Textarea
        id="description"
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        placeholder="League description..."
        rows={3}
        className="mt-1 resize-none"
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="start_date" className="text-sm font-medium">Start Date *</Label>
        <Input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) => handleInputChange('start_date', e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="end_date" className="text-sm font-medium">End Date *</Label>
        <Input
          id="end_date"
          type="date"
          value={formData.end_date}
          onChange={(e) => handleInputChange('end_date', e.target.value)}
          className="mt-1"
        />
      </div>
    </div>

    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
      <Button 
        onClick={handleSave} 
        disabled={saving || !formData.name}
        className="w-full sm:w-auto"
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

              {/* Division Overview with Fixture Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Teams & Divisions Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {divisions.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No Divisions Created</h3>
                      <p className="text-muted-foreground mb-4">
                        Create divisions to organize teams by skill level.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {divisions.map((division: Division) => {
                        const divisionTeams = teamRegistrations.filter(reg => reg.division_id === division.id);
                        const approvedTeams = divisionTeams.filter(reg => reg.status === 'approved');
                        const divisionFixtures = fixtures.filter(match => match.division_id === division.id);
                        
                        return (
                          <Card key={division.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{division.name}</CardTitle>
                                  <p className="text-sm text-muted-foreground">
                                    Level {division.level} • {approvedTeams.length} approved teams • {divisionFixtures.length} matches
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  {divisionFixtures.length === 0 && approvedTeams.length >= 2 && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => generateFixtures(division.id)}
                                      disabled={generatingFixtures}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {generatingFixtures ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-4 h-4 mr-2" />
                                          Generate Fixtures
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  {divisionFixtures.length > 0 && (
                                    <Button size="sm" variant="outline">
                                      <Calendar className="w-4 h-4 mr-2" />
                                      {divisionFixtures.length} Fixtures Created
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {divisionTeams.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No teams registered for this division yet.</p>
                              ) : (
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm">Registered Teams:</h4>
                                  <div className="grid gap-2">
                                    {divisionTeams.map((registration) => (
                                      <div key={registration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Users className="w-4 h-4 text-blue-600" />
                                          </div>
                                          <div>
                                            <div className="font-medium">{registration.team?.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                              {registration.team?.player1?.full_name} & {registration.team?.player2?.full_name || 'Pending'}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge className={`${
                                            registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                          }`}>
                                            {registration.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

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
                                      Registered: {registration.registered_at ? new Date(registration.registered_at).toLocaleDateString() : 'Unknown'}
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
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle>Match Fixtures Management</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleGenerateFixtures}
                            disabled={isGeneratingFixtures || isClearingMatches}
                            className="flex-1"
                          >
                            {isGeneratingFixtures ? 'Generating...' : 'Generate Round-Robin Fixtures'}
                          </Button>
                          
                          {fixtures.length > 0 && (
                            <Button 
                              onClick={handleClearMatches}
                              disabled={isGeneratingFixtures || isClearingMatches}
                              variant="destructive"
                              className="flex-1"
                            >
                              {isClearingMatches ? 'Clearing...' : 'Clear All Matches'}
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          Generate creates matches for all approved teams. Clear removes all existing matches.
                        </p>
                        
                        {fixtures.length > 0 && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-blue-700">
                              ✅ {fixtures.length} matches currently generated
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                </>
              )}
            </TabsContent>

            {/* Matches Tab */}
            {/* Matches Tab */}
<TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Match Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending-admin" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pending-admin" className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Pending Confirmations
                      {pendingConfirmationsAdmin.length > 0 && (
                        <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                          {pendingConfirmationsAdmin.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="upcoming-admin" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Upcoming
                      {upcomingMatchesAdmin.length > 0 && (
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                          {upcomingMatchesAdmin.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="completed-admin" className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Completed
                    </TabsTrigger>
                    <TabsTrigger value="all-admin" className="flex items-center gap-2">
                      All Matches
                    </TabsTrigger>
                  </TabsList>

                  {/* Pending Confirmations Tab */}
                  <TabsContent value="pending-admin">
                    {pendingConfirmationsAdmin.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">All Matches Confirmed</h3>
                        <p className="text-muted-foreground">
                          No pending confirmations from teams
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingConfirmationsAdmin.map((confirmation) => (
                          <Card key={confirmation.id} className="border-l-4 border-l-yellow-500">
                            <CardContent className="p-4 sm:p-6">
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-base sm:text-lg font-semibold truncate">
                                      {confirmation.match.team1.name} vs {confirmation.match.team2.name}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {confirmation.match.league.name} • {confirmation.match.division.name}
                                    </p>
                                  </div>
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs whitespace-nowrap">
                                    Pending Confirmation
                                  </Badge>
                                </div>

                                {/* Match Details */}
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-blue-600" />
                                      <span>{new Date(confirmation.match.scheduled_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-blue-600" />
                                      <span>{confirmation.match.scheduled_time}</span>
                                    </div>
                                    {confirmation.match.venue && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        <span className="truncate">{confirmation.match.venue}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
                                  <Button
                                    onClick={() => handleConfirmMatch(confirmation.id)}
                                    disabled={processing === confirmation.id}
                                    className="bg-green-600 hover:bg-green-700 w-full sm:flex-1"
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
                                    className="w-full sm:flex-1"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reschedule
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Upcoming Matches Tab */}
                  <TabsContent value="upcoming-admin">
                    {upcomingMatchesAdmin.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Upcoming Matches</h3>
                        <p className="text-muted-foreground">
                          Confirmed matches will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingMatchesAdmin.map((match) => (
                          <Card key={match.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {match.team1.name} vs {match.team2.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {match.division.name} • {new Date(match.scheduled_date).toLocaleDateString()}
                                    {match.scheduled_time && ` at ${match.scheduled_time}`}
                                    {match.venue && ` • ${match.venue}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>
                                  <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedMatchForScoring(match);
                                        setScoreModalOpen(true);
                                      }}
                                    >
                                      <Trophy className="w-4 h-4 mr-2" />
                                      Record Result
                                    </Button>

                                    {/* In All Matches tab */}
                                    {match.status === 'confirmed' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedMatchForScoring(match);
                                          setScoreModalOpen(true);
                                        }}
                                      >
                                        <Trophy className="w-4 h-4 mr-2" />
                                        Record Result
                                      </Button>
                                    )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Completed Matches Tab */}
                  <TabsContent value="completed-admin">
                    {completedMatchesAdmin.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Completed Matches</h3>
                        <p className="text-muted-foreground">
                          Completed matches will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {completedMatchesAdmin.map((match) => (
                          <Card key={match.id} className="border-l-4 border-l-green-500">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {match.team1.name} vs {match.team2.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {match.division.name} • {new Date(match.scheduled_date).toLocaleDateString()}
                                    {match.scheduled_time && ` at ${match.scheduled_time}`}
                                    {match.venue && ` • ${match.venue}`}
                                  </p>
                                  {match.team1_score !== null && match.team2_score !== null && (
                                    <p className="text-sm font-medium text-green-700 mt-1">
                                      Final Score: {match.team1_score} - {match.team2_score}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                  <Button size="sm" variant="outline">
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* All Matches Tab */}
                  <TabsContent value="all-admin">
                    {adminMatches.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Matches Generated</h3>
                        <p className="text-muted-foreground mb-4">
                          Generate fixtures in the Teams tab first
                        </p>
                        <Button variant="outline" onClick={() => {
                          const teamsTab = document.querySelector('[value="teams"]') as HTMLElement;
                          teamsTab?.click();
                        }}>
                          <Users className="w-4 h-4 mr-2" />
                          Go to Teams Tab
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {adminMatches.map((match) => (
                          <Card key={match.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {match.team1.name} vs {match.team2.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {match.division.name} • {new Date(match.scheduled_date).toLocaleDateString()}
                                    {match.scheduled_time && ` at ${match.scheduled_time}`}
                                    {match.venue && ` • ${match.venue}`}
                                  </p>
                                  {match.team1_score !== null && match.team2_score !== null && (
                                    <p className="text-sm font-medium text-green-700 mt-1">
                                      Final Score: {match.team1_score} - {match.team2_score}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={
                                    match.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    match.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                    match.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {match.status === 'completed' ? 'Completed' :
                                    match.status === 'confirmed' ? 'Confirmed' :
                                    match.status === 'scheduled' ? 'Scheduled' :
                                    match.status}
                                  </Badge>
                                  {match.status === 'scheduled' && (
                                    <Button size="sm" variant="outline" onClick={() => {
                                      setSchedulingMatch(match.id);
                                      setScheduleForm({
                                        matchId: match.id,
                                        date: match.scheduled_date || '',
                                        time: match.scheduled_time || '',
                                        venue: match.venue || ''
                                      });
                                    }}>
                                      <Clock className="w-4 h-4 mr-2" />
                                      Schedule
                                    </Button>
                                  )}
                                  {match.status === 'confirmed' && (
                                    <Button size="sm" variant="outline">
                                      <Trophy className="w-4 h-4 mr-2" />
                                      Record Result
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* Add this before the closing </div> in ManageLeague */}
        <ScoreRecordingModal
          isOpen={scoreModalOpen}
          onClose={() => {
            setScoreModalOpen(false);
            setSelectedMatchForScoring(null);
          }}
          match={selectedMatchForScoring}
          onScoreRecorded={() => {
            fetchAdminMatches(); // Refresh admin matches
            fetchFixtures(); // Refresh fixtures if needed
          }}
          />
      </div>
  );
};

export default ManageLeague;