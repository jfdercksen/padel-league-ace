import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Users, Calendar, Settings, Pencil, Trash2, UserPlus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { useToast } from '@/components/ui/use-toast';
import Leaderboard from '@/components/Leaderboard';

// Helper functions for date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB'); // dd/mm/yyyy format for display
};

// Format date for input fields (yyyy-MM-dd)
const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // yyyy-MM-dd format for input fields
};

// League Settings Form Component
interface LeagueSettingsFormProps {
  league: {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: string;
    registration_deadline?: string;
    max_teams_per_division?: number;
    match_format?: string;
    entry_fee?: number;
    currency?: string;
  };
  leagueId: string | undefined;
  onUpdate: () => void;
}

const LeagueSettingsForm = ({ league, leagueId, onUpdate }: LeagueSettingsFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(true);
  const [isEditingDivision, setIsEditingDivision] = useState<string | null>(null);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [editedDivisionName, setEditedDivisionName] = useState('');
  const [isAddingDivision, setIsAddingDivision] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState<string | null>(null);
  const [isDeleteDivisionDialogOpen, setIsDeleteDivisionDialogOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  const fetchDivisionsAndTeams = useCallback(async () => {
    setIsLoadingDivisions(true);
    try {
      // Fetch divisions
      const { data: divisionsData, error: divisionsError } = await supabase
        .from('divisions')
        .select('id, name, level')
        .eq('league_id', leagueId)
        .order('level');

      if (divisionsError) throw divisionsError;
      setDivisions(divisionsData || []);

      // Fetch teams for checking division assignments
      const { data: registrations, error: teamsError } = await supabase
        .from('league_registrations')
        .select(`
          id,
          status,
          team_id,
          division_id,
          team:teams (
            id,
            name,
            player1:profiles!teams_player1_id_fkey (id, full_name),
            player2:profiles!teams_player2_id_fkey (id, full_name)
          ),
          division:divisions (id, name)
        `)
        .eq('league_id', leagueId);

      if (teamsError) throw teamsError;

      const transformedTeams = registrations?.map(reg => ({
        id: reg.team.id,
        name: reg.team.name,
        player1: reg.team.player1,
        player2: reg.team.player2,
        division: reg.division,
        registrations: [{ status: reg.status, id: reg.id }]
      })) || [];

      setTeams(transformedTeams);
    } catch (error) {
      console.error('Error fetching divisions or teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load divisions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingDivisions(false);
    }
  }, [leagueId, toast]);

  // Fetch divisions and teams when component mounts
  useEffect(() => {
    if (leagueId) {
      fetchDivisionsAndTeams();
    }
  }, [leagueId, fetchDivisionsAndTeams]);

  // Function to refresh divisions after changes
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
      console.error('Error refreshing divisions:', error);
    }
  };

  const [formData, setFormData] = useState({
    name: league.name,
    description: league.description || '',
    start_date: formatDateForInput(league.start_date),
    end_date: formatDateForInput(league.end_date),
    status: league.status,
    registration_deadline: formatDateForInput(league.registration_deadline || ''),
    max_teams_per_division: league.max_teams_per_division || '',
    match_format: league.match_format || '',
    entry_fee: league.entry_fee || '',
    currency: league.currency || 'ZAR'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create update object without the currency field
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        registration_deadline: formData.registration_deadline || null,
        max_teams_per_division: formData.max_teams_per_division ? Number(formData.max_teams_per_division) : null,
        match_format: formData.match_format || null,
        entry_fee: formData.entry_fee ? Number(formData.entry_fee) : null
        // Removed currency field as it doesn't exist in the database
      };

      const { error } = await supabase
        .from('leagues')
        .update(updateData)
        .eq('id', leagueId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'League settings updated successfully',
        variant: 'default'
      });

      onUpdate(); // Refresh league data
    } catch (error) {
      console.error('Error updating league settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update league settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">League Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Brief description of the league (optional)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="registration_deadline">Registration Deadline</Label>
            <Input
              id="registration_deadline"
              name="registration_deadline"
              type="date"
              value={formData.registration_deadline}
              onChange={handleChange}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Last day teams can register for the league
            </p>
          </div>
          <div>
            <Label htmlFor="max_teams_per_division">Maximum Teams per Division</Label>
            <Input
              id="max_teams_per_division"
              name="max_teams_per_division"
              type="number"
              min="2"
              value={formData.max_teams_per_division}
              onChange={handleChange}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Limit the number of teams in each division
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="match_format">Match Format</Label>
            <Select
              name="match_format"
              value={formData.match_format.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, match_format: value }))}>
              <SelectTrigger id="match_format" className="mt-1">
                <SelectValue placeholder="Select match format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best_of_3">Best of 3 Sets</SelectItem>
                <SelectItem value="best_of_5">Best of 5 Sets</SelectItem>
                <SelectItem value="single_set">Single Set</SelectItem>
                <SelectItem value="timed">Timed Match</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Format used for matches in this league
            </p>
          </div>
          <div>
            <Label htmlFor="entry_fee">Entry Fee</Label>
            <div className="flex gap-2 mt-1">
              <div className="w-1/3">
                <Select
                  name="currency"
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR (R)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  {formData.currency === 'ZAR' ? 'R' :
                    formData.currency === 'USD' ? '$' :
                      formData.currency === 'EUR' ? '€' :
                        formData.currency === 'GBP' ? '£' : 'R'}
                </span>
                <Input
                  id="entry_fee"
                  name="entry_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.entry_fee}
                  onChange={handleChange}
                  className="pl-7"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fee to join the league (leave empty if free)
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="status">League Status</Label>
          <Select name="status" value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger id="status" className="mt-1">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="registration_open">Registration Open</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Division Management Section */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-medium mb-4">Division Management</h3>

        <div className="space-y-4">
          {/* Existing Divisions */}
          <div className="bg-muted/30 rounded-md p-4">
            <h4 className="text-sm font-medium mb-3">Current Divisions</h4>

            {divisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No divisions created yet.</p>
            ) : (
              <div className="space-y-2">
                {divisions.map((division) => (
                  <div key={division.id} className="flex items-center justify-between bg-background p-2 rounded-md border">
                    {isEditingDivision === division.id ? (
                      <Input
                        value={editedDivisionName}
                        onChange={(e) => setEditedDivisionName(e.target.value)}
                        className="w-full max-w-xs"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{division.name}</span>
                        <Badge variant="outline" className="text-xs">Level {division.level}</Badge>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {isEditingDivision === division.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('divisions')
                                  .update({ name: editedDivisionName })
                                  .eq('id', division.id);

                                if (error) throw error;

                                toast({
                                  title: 'Success',
                                  description: 'Division name updated',
                                  variant: 'default'
                                });

                                setIsEditingDivision(null);
                                fetchDivisions(); // Refresh divisions
                              } catch (error) {
                                console.error('Error updating division:', error);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update division',
                                  variant: 'destructive'
                                });
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditingDivision(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingDivision(division.id);
                              setEditedDivisionName(division.name);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              // Check if division has teams
                              const teamsInDivision = teams.filter(team => team.division?.id === division.id);
                              if (teamsInDivision.length > 0) {
                                toast({
                                  title: 'Cannot Delete',
                                  description: `This division has ${teamsInDivision.length} teams assigned to it. Reassign teams first.`,
                                  variant: 'destructive'
                                });
                                return;
                              }

                              try {
                                const { error } = await supabase
                                  .from('divisions')
                                  .delete()
                                  .eq('id', division.id);

                                if (error) throw error;

                                toast({
                                  title: 'Success',
                                  description: 'Division deleted',
                                  variant: 'default'
                                });

                                fetchDivisions(); // Refresh divisions
                              } catch (error) {
                                console.error('Error deleting division:', error);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to delete division',
                                  variant: 'destructive'
                                });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Division */}
          <div className="bg-muted/30 rounded-md p-4">
            <h4 className="text-sm font-medium mb-3">Add New Division</h4>

            {isAddingDivision ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={newDivisionName}
                    onChange={(e) => setNewDivisionName(e.target.value)}
                    placeholder="Division name"
                    className="w-full max-w-xs"
                  />
                  <Select defaultValue={(divisions.length + 1).toString()}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(10)].map((_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>Level {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      if (!newDivisionName.trim()) {
                        toast({
                          title: 'Error',
                          description: 'Division name cannot be empty',
                          variant: 'destructive'
                        });
                        return;
                      }

                      try {
                        const { error } = await supabase
                          .from('divisions')
                          .insert({
                            league_id: leagueId,
                            name: newDivisionName,
                            level: divisions.length + 1
                          });

                        if (error) throw error;

                        toast({
                          title: 'Success',
                          description: 'New division added',
                          variant: 'default'
                        });

                        setNewDivisionName('');
                        setIsAddingDivision(false);
                        fetchDivisions(); // Refresh divisions
                      } catch (error) {
                        console.error('Error adding division:', error);
                        toast({
                          title: 'Error',
                          description: 'Failed to add division',
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    Add Division
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsAddingDivision(false);
                      setNewDivisionName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsAddingDivision(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Division
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
};

interface League {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  registration_deadline?: string;
  max_teams_per_division?: number;
  match_format?: string;
  entry_fee?: number;
  currency?: string;
  is_approved?: boolean;
}

interface Team {
  id: string;
  name: string;
  player1: {
    id: string;
    full_name: string;
    email?: string;
  };
  player2?: {
    id: string;
    full_name: string;
    email?: string;
  };
  division?: {
    id: string;
    name: string;
  };
  registrations?: {
    id: string;
    status: string;
    team_id: string;
    division_id: string;
  }[];
}

interface Division {
  id: string;
  name: string;
  level: number;
}

interface Profile {
  id: string;
  full_name: string;
  email?: string;
}

const ManageLeague = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');

  // Team management state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    player1Id: '',
    player2Id: '',
    divisionId: ''
  });
  const [addFormData, setAddFormData] = useState({
    name: '',
    player1Id: '',
    player2Id: '',
    divisionId: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);

  // Match management state
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isCreateMatchDialogOpen, setIsCreateMatchDialogOpen] = useState(false);
  const [isEditMatchDialogOpen, setIsEditMatchDialogOpen] = useState(false);
  const [isDeleteMatchDialogOpen, setIsDeleteMatchDialogOpen] = useState(false);
  const [isGenerateMatchesDialogOpen, setIsGenerateMatchesDialogOpen] = useState(false);
  const [isBulkScheduleDialogOpen, setIsBulkScheduleDialogOpen] = useState(false);
  const [isClearMatchesDialogOpen, setIsClearMatchesDialogOpen] = useState(false);
  const [clearMatchesConfirmation, setClearMatchesConfirmation] = useState('');
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [generatedMatches, setGeneratedMatches] = useState<any[]>([]);
  const [selectedMatchDivision, setSelectedMatchDivision] = useState<string>('all');
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [pendingMatches, setPendingMatches] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [completedMatches, setCompletedMatches] = useState<any[]>([]);
  const [matchesActiveTab, setMatchesActiveTab] = useState('all');
  const [generateMatchesFormData, setGenerateMatchesFormData] = useState({
    divisionId: ''
  });
  const [bulkScheduleFormData, setBulkScheduleFormData] = useState({
    date: '',
    time: '',
    venue: '',
    status: 'pending'
  });
  const [matchFormData, setMatchFormData] = useState({
    divisionId: '',
    team1Id: '',
    team2Id: '',
    date: '',
    time: '',
    venue: '',
    status: 'pending'
  });
  const [editMatchFormData, setEditMatchFormData] = useState({
    divisionId: '',
    team1Id: '',
    team2Id: '',
    date: '',
    time: '',
    venue: '',
    status: ''
  });

  useEffect(() => {
    if (!profile || (profile.role !== 'league_admin' && profile.role !== 'super_admin')) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to manage leagues.',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }

    fetchLeague();
    fetchTeams();
    fetchDivisions();
    fetchProfiles();
  }, [profile, leagueId]);

  const fetchLeague = async () => {
    if (!leagueId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (error) throw error;
      setLeague(data);
    } catch (error) {
      console.error('Error fetching league:', error);
      toast({
        title: 'Error',
        description: 'Failed to load league information.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!leagueId) return;

    try {
      const { data: registrations, error: regError } = await supabase
        .from('league_registrations')
        .select(`
          id,
          team_id,
          division_id,
          status,
          team:teams (
            id,
            name,
            player1:profiles!teams_player1_id_fkey (id, full_name, email),
            player2:profiles!teams_player2_id_fkey (id, full_name, email)
          ),
          division:divisions (id, name)
        `)
        .eq('league_id', leagueId);

      if (regError) throw regError;

      // Transform the data to match our Team interface
      const transformedTeams = registrations?.map(reg => ({
        id: reg.team.id,
        name: reg.team.name,
        player1: reg.team.player1,
        player2: reg.team.player2,
        division: reg.division,
        registrations: [{
          id: reg.id,
          status: reg.status,
          team_id: reg.team_id,
          division_id: reg.division_id
        }]
      })) || [];

      setTeams(transformedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const fetchDivisions = async () => {
    if (!leagueId) return;

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

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleRemoveTeamFromLeague = async (teamId: string, teamName: string) => {
    if (!leagueId) return;

    if (!confirm(`Are you sure you want to remove "${teamName}" from this league? This will delete their registration and statistics.`)) {
      return;
    }

    setRemovingTeamId(teamId);

    try {
      // Delete the league registration for this team and league
      const { error } = await supabase
        .from('league_registrations')
        .delete()
        .eq('team_id', teamId)
        .eq('league_id', leagueId);

      if (error) throw error;

      toast({
        title: 'Team Removed',
        description: `${teamName} has been removed from the league.`,
        variant: 'default'
      });

      if (typeof fetchDivisionsAndTeams === 'function') {
        fetchDivisionsAndTeams();
      } else {
        setTeams(prev => prev.filter(t => t.id !== teamId));
      }
    } catch (error: any) {
      console.error('Error removing team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove team from league',
        variant: 'destructive'
      });
    } finally {
      setRemovingTeamId(null);
    }
  };

  const handleEditClick = (team: Team) => {
    setSelectedTeam(team);
    setEditFormData({
      name: team.name,
      player1Id: team.player1.id,
      player2Id: team.player2?.id || 'none',
      divisionId: team.division?.id || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (team: Team) => {
    setSelectedTeam(team);
    setDeleteConfirmation('');
    setIsDeleteDialogOpen(true);
  };

  const handleAddClick = () => {
    setAddFormData({
      name: '',
      player1Id: '',
      player2Id: 'none',
      divisionId: ''
    });
    setIsAddDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedTeam) return;

    try {
      // Update team name and players
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          name: editFormData.name,
          player1_id: editFormData.player1Id,
          player2_id: editFormData.player2Id === "none" ? null : editFormData.player2Id || null
        })
        .eq('id', selectedTeam.id);

      if (teamError) throw teamError;

      // Update division in league_registrations
      const { error: regError } = await supabase
        .from('league_registrations')
        .update({
          division_id: editFormData.divisionId
        })
        .eq('team_id', selectedTeam.id)
        .eq('league_id', leagueId);

      if (regError) throw regError;

      toast({
        title: 'Success',
        description: 'Team updated successfully',
        variant: 'default'
      });

      // Refresh teams list
      fetchTeams();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedTeam || deleteConfirmation !== selectedTeam.name) return;

    try {
      // First, delete the team from league_registrations
      const { error: regError } = await supabase
        .from('league_registrations')
        .delete()
        .eq('team_id', selectedTeam.id)
        .eq('league_id', leagueId);

      if (regError) throw regError;

      // Then, delete the team itself
      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', selectedTeam.id);

      if (teamError) throw teamError;

      toast({
        title: 'Success',
        description: 'Team deleted successfully',
        variant: 'default'
      });

      // Refresh teams list
      fetchTeams();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddSubmit = async () => {
    try {
      // First, create the team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: addFormData.name,
          player1_id: addFormData.player1Id,
          player2_id: addFormData.player2Id === "none" ? null : addFormData.player2Id || null
        })
        .select('id')
        .single();

      if (teamError) throw teamError;

      // Then, register the team in the league
      const { error: regError } = await supabase
        .from('league_registrations')
        .insert({
          league_id: leagueId,
          team_id: newTeam.id,
          division_id: addFormData.divisionId,
          points: 0,
          matches_played: 0,
          matches_won: 0
        });

      if (regError) throw regError;

      toast({
        title: 'Success',
        description: 'Team added successfully',
        variant: 'default'
      });

      // Refresh teams list
      fetchTeams();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding team:', error);
      toast({
        title: 'Error',
        description: 'Failed to add team. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Match management functions
  useEffect(() => {
    if (activeTab === 'matches') {
      fetchMatches();
    }
  }, [activeTab, leagueId]);

  // Filter and categorize matches when matches data or division filter changes
  useEffect(() => {
    if (matches.length > 0) {
      // Filter matches by division if a specific division is selected
      let filtered = matches;
      if (selectedMatchDivision !== 'all') {
        filtered = matches.filter(match => match.division_id === selectedMatchDivision);
      }

      setFilteredMatches(filtered);

      // Categorize matches by status
      setPendingMatches(filtered.filter(match => match.status === 'pending'));
      setUpcomingMatches(filtered.filter(match => match.status === 'confirmed' && !match.team1_score && !match.team2_score));
      setCompletedMatches(filtered.filter(match => match.status === 'completed' || match.team1_score !== null || match.team2_score !== null));
    }
  }, [matches, selectedMatchDivision]);

  const fetchMatches = async () => {
    if (!leagueId) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          team1_id,
          team2_id,
          division_id,
          scheduled_date,
          scheduled_time,
          venue,
          status,
          team1:teams!matches_team1_id_fkey (id, name),
          team2:teams!matches_team2_id_fkey (id, name),
          division:divisions (id, name)
        `)
        .eq('league_id', leagueId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load matches. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleEditMatchClick = (match: any) => {
    setSelectedMatch(match);

    // Filter teams by the match's division
    const divisionTeams = teams.filter(team =>
      team.division?.id === match.division_id
    );
    setFilteredTeams(divisionTeams);

    setEditMatchFormData({
      divisionId: match.division_id || '',
      team1Id: match.team1_id || '',
      team2Id: match.team2_id || '',
      date: match.scheduled_date || '',
      time: match.scheduled_time || '',
      venue: match.venue || '',
      status: match.status || ''
    });

    setIsEditMatchDialogOpen(true);
  };

  const handleDeleteMatchClick = (match: any) => {
    setSelectedMatch(match);
    setIsDeleteMatchDialogOpen(true);
  };

  const handleCreateMatchSubmit = async () => {
    try {
      const { error } = await supabase
        .from('matches')
        .insert({
          league_id: leagueId,
          division_id: matchFormData.divisionId,
          team1_id: matchFormData.team1Id,
          team2_id: matchFormData.team2Id,
          scheduled_date: matchFormData.date,
          scheduled_time: matchFormData.time || null,
          venue: matchFormData.venue || null,
          status: matchFormData.status
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Match created successfully',
        variant: 'default'
      });

      // Reset form and refresh matches
      setMatchFormData({
        divisionId: '',
        team1Id: '',
        team2Id: '',
        date: '',
        time: '',
        venue: '',
        status: 'pending'
      });
      fetchMatches();
      setIsCreateMatchDialogOpen(false);
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: 'Error',
        description: 'Failed to create match. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleEditMatchSubmit = async () => {
    if (!selectedMatch) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          division_id: editMatchFormData.divisionId,
          team1_id: editMatchFormData.team1Id,
          team2_id: editMatchFormData.team2Id,
          scheduled_date: editMatchFormData.date,
          scheduled_time: editMatchFormData.time || null,
          venue: editMatchFormData.venue || null,
          status: editMatchFormData.status
        })
        .eq('id', selectedMatch.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Match updated successfully',
        variant: 'default'
      });

      // Refresh matches list
      fetchMatches();
      setIsEditMatchDialogOpen(false);
    } catch (error) {
      console.error('Error updating match:', error);
      toast({
        title: 'Error',
        description: 'Failed to update match. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMatchSubmit = async () => {
    if (!selectedMatch) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', selectedMatch.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Match deleted successfully',
        variant: 'default'
      });

      // Refresh matches list
      fetchMatches();
      setIsDeleteMatchDialogOpen(false);
    } catch (error) {
      console.error('Error deleting match:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete match. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Generate matches between all teams in a division
  const handleGenerateMatches = async () => {
    const divisionId = generateMatchesFormData.divisionId;
    if (!divisionId) return;

    try {
      // Get all teams in the selected division
      const divisionTeams = teams.filter(team => team.division?.id === divisionId);

      if (divisionTeams.length < 2) {
        toast({
          title: 'Not enough teams',
          description: 'You need at least 2 teams in this division to generate matches.',
          variant: 'destructive'
        });
        return;
      }

      // Generate all possible team pairings (round-robin tournament style)
      const generatedPairings = [];
      for (let i = 0; i < divisionTeams.length; i++) {
        for (let j = i + 1; j < divisionTeams.length; j++) {
          generatedPairings.push({
            team1Id: divisionTeams[i].id,
            team1Name: divisionTeams[i].name,
            team2Id: divisionTeams[j].id,
            team2Name: divisionTeams[j].name,
            divisionId: divisionId,
            divisionName: divisionTeams[i].division?.name || 'Unknown Division'
          });
        }
      }

      // Check if any of these matches already exist
      const existingMatches = matches.filter(match =>
        match.division_id === divisionId &&
        generatedPairings.some(pairing =>
          (pairing.team1Id === match.team1_id && pairing.team2Id === match.team2_id) ||
          (pairing.team1Id === match.team2_id && pairing.team2Id === match.team1_id)
        )
      );

      if (existingMatches.length > 0) {
        // Filter out pairings that already have matches
        const filteredPairings = generatedPairings.filter(pairing =>
          !existingMatches.some(match =>
            (pairing.team1Id === match.team1_id && pairing.team2Id === match.team2_id) ||
            (pairing.team1Id === match.team2_id && pairing.team2Id === match.team1_id)
          )
        );

        if (filteredPairings.length === 0) {
          toast({
            title: 'No new matches',
            description: 'All possible matches between teams in this division already exist.',
            variant: 'default'
          });
          setIsGenerateMatchesDialogOpen(false);
          return;
        }

        setGeneratedMatches(filteredPairings);
        toast({
          title: 'Matches Generated',
          description: `Generated ${filteredPairings.length} new matches. Some matches were skipped because they already exist.`,
          variant: 'default'
        });
      } else {
        setGeneratedMatches(generatedPairings);
        toast({
          title: 'Matches Generated',
          description: `Generated ${generatedPairings.length} matches between teams in this division.`,
          variant: 'default'
        });
      }

      // Close the generate dialog and open the bulk schedule dialog
      setIsGenerateMatchesDialogOpen(false);
      setIsBulkScheduleDialogOpen(true);
    } catch (error) {
      console.error('Error generating matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate matches. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Clear all matches and reset team statistics
  const handleClearAllMatches = async () => {
    if (clearMatchesConfirmation !== 'CLEAR ALL MATCHES') return;

    try {
      // Step 1: Delete all match confirmations for this league's matches
      console.log('Deleting match confirmations...');
      const { data: matchIds } = await supabase
        .from('matches')
        .select('id')
        .eq('league_id', leagueId);

      if (matchIds && matchIds.length > 0) {
        const ids = matchIds.map(m => m.id);
        const { error: confirmationError } = await supabase
          .from('match_confirmations')
          .delete()
          .in('match_id', ids);

        if (confirmationError) {
          console.error('Error deleting match confirmations:', confirmationError);
        }
      }

      // Step 2: Delete all matches in this league
      console.log('Deleting all matches...');
      const { error: matchError } = await supabase
        .from('matches')
        .delete()
        .eq('league_id', leagueId);

      if (matchError) throw matchError;

      // Step 3: Reset all team statistics in this league
      console.log('Resetting team statistics...');
      const { error: statsError } = await supabase
        .from('league_registrations')
        .update({
          points: 0,
          bonus_points: 0,
          matches_played: 0,
          matches_won: 0
        })
        .eq('league_id', leagueId);

      if (statsError) throw statsError;

      toast({
        title: 'Success',
        description: 'All matches have been cleared and team statistics have been reset.',
        variant: 'default'
      });

      // Reset and close dialog
      setClearMatchesConfirmation('');
      setIsClearMatchesDialogOpen(false);

      // Refresh matches list
      fetchMatches();
    } catch (error) {
      console.error('Error clearing matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear matches. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Schedule all generated matches with the same date, time, and venue
  const handleBulkScheduleSubmit = async () => {
    if (generatedMatches.length === 0 || !bulkScheduleFormData.date) return;

    try {
      // Prepare the matches for insertion
      const matchesToInsert = generatedMatches.map(match => ({
        league_id: leagueId,
        division_id: match.divisionId,
        team1_id: match.team1Id,
        team2_id: match.team2Id,
        scheduled_date: bulkScheduleFormData.date,
        scheduled_time: bulkScheduleFormData.time || null,
        venue: bulkScheduleFormData.venue || null,
        status: 'pending', // Always set to pending for player approval
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Insert all matches at once and get the inserted records
      const { data: insertedMatches, error } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select();

      if (error) throw error;

      // Create match confirmations for each team in each match
      if (insertedMatches && insertedMatches.length > 0) {
        console.log('Creating match confirmations for inserted matches:', insertedMatches);

        // Prepare confirmations for all teams
        const confirmations = [];
        for (const match of insertedMatches) {
          // Add confirmation for team 1
          confirmations.push({
            match_id: match.id,
            team_id: match.team1_id,
            status: 'pending',
            created_at: new Date().toISOString()
          });

          // Add confirmation for team 2
          confirmations.push({
            match_id: match.id,
            team_id: match.team2_id,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        }

        // Insert all confirmations
        const { error: confirmationError } = await supabase
          .from('match_confirmations')
          .insert(confirmations);

        if (confirmationError) {
          console.error('Error creating match confirmations:', confirmationError);
          toast({
            title: 'Warning',
            description: 'Matches created but player confirmations may not have been set up correctly.',
            variant: 'destructive'
          });
        } else {
          console.log('✅ Successfully created match confirmations for all teams');
        }
      }

      toast({
        title: 'Success',
        description: `${matchesToInsert.length} matches have been scheduled and are pending player approval.`,
        variant: 'default'
      });

      // Reset and close dialog
      setGeneratedMatches([]);
      setBulkScheduleFormData({
        date: '',
        time: '',
        venue: '',
        status: 'pending'
      });
      setIsBulkScheduleDialogOpen(false);

      // Refresh matches list
      fetchMatches();
    } catch (error) {
      console.error('Error scheduling matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule matches. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading league information...</p>
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
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">League Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The league you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link to="/">
                <Button>Return to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/leagues">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leagues
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 sm:w-8 sm:h-8" />
                Manage League
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Configure and manage {league.name}
              </p>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{league.name}</h3>
                  {league.description && (
                    <p className="text-muted-foreground text-sm mt-1">
                      {league.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Season: {formatDate(league.start_date)} - {formatDate(league.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {league.status?.toLowerCase() === 'active' ? 'Active Season' :
                      league.status?.toLowerCase() === 'upcoming' ? 'Upcoming Season' :
                        league.status?.toLowerCase() === 'draft' ? 'Draft Mode' :
                          'Season Ended'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">(Status: {league.status})</span>
                  {league.status === 'draft' && (
                    <Badge className="ml-2 bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md mx-auto">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Matches</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Standings</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Management
                </CardTitle>
                <Button onClick={handleAddClick} className="bg-green-600 hover:bg-green-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Team
                </Button>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Teams Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Add teams to this league to get started.
                    </p>
                    <Button onClick={handleAddClick}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Team
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Name</TableHead>
                          <TableHead>Players</TableHead>
                          <TableHead>Division</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((team) => {
                          // Get registration status from team data
                          const registration = team.registrations && team.registrations[0];
                          const status = registration ? registration.status : 'approved';
                          const isPending = status === 'pending';

                          return (
                            <TableRow key={team.id} className={isPending ? "bg-yellow-50" : ""}>
                              <TableCell className="font-medium">{team.name}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div>{team.player1.full_name}</div>
                                  {team.player2 && <div>{team.player2.full_name}</div>}
                                </div>
                              </TableCell>
                              <TableCell>
                                {team.division ? (
                                  <Badge variant="outline">{team.division.name}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Not assigned</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isPending ? (
                                  <Badge variant="secondary">Waiting for approval</Badge>
                                ) : (
                                  <Badge variant="default">Approved</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {isPending && (
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                                        onClick={async () => {
                                          try {
                                            // Update the registration status to approved
                                            // First, get the registration ID
                                            const registration = team.registrations && team.registrations[0];
                                            if (!registration) {
                                              throw new Error("Registration not found");
                                            }

                                            const { error } = await supabase
                                              .from('league_registrations')
                                              .update({ status: 'approved' })
                                              .eq('id', registration.id);

                                            if (error) throw error;

                                            // Update local state
                                            setTeams(teams.map(t => {
                                              if (t.id === team.id && t.registrations && t.registrations[0]) {
                                                return {
                                                  ...t,
                                                  registrations: [{
                                                    ...t.registrations[0],
                                                    status: 'approved'
                                                  }]
                                                };
                                              }
                                              return t;
                                            }));

                                            toast({
                                              title: "Team Approved",
                                              description: `${team.name} has been approved to join the league.`,
                                              variant: "default"
                                            });
                                          } catch (error) {
                                            console.error('Error approving team:', error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to approve team. Please try again.",
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve
                                      </Button>
                                    </div>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditClick(team)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemoveTeamFromLeague(team.id, team.name)}
                                    disabled={removingTeamId === team.id}
                                  >
                                    {removingTeamId === team.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Remove
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteClick(team)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Edit Team Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Team</DialogTitle>
                      <DialogDescription>
                        Update team information and division assignment.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="team-name">Team Name</Label>
                        <Input
                          id="team-name"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          placeholder="Enter team name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player1">Player 1</Label>
                        <Select
                          value={editFormData.player1Id}
                          onValueChange={(value) => setEditFormData({ ...editFormData, player1Id: value })}
                        >
                          <SelectTrigger id="player1">
                            <SelectValue placeholder="Select player 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player2">Player 2 (Optional)</Label>
                        <Select
                          value={editFormData.player2Id}
                          onValueChange={(value) => setEditFormData({ ...editFormData, player2Id: value })}
                        >
                          <SelectTrigger id="player2">
                            <SelectValue placeholder="Select player 2 (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="division">Division</Label>
                        <Select
                          value={editFormData.divisionId}
                          onValueChange={(value) => setEditFormData({ ...editFormData, divisionId: value })}
                        >
                          <SelectTrigger id="division">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map((division) => (
                              <SelectItem key={division.id} value={division.id}>
                                {division.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleEditSubmit}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Delete Team Dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        Delete Team
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete the team
                        and remove all associated data.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="confirm" className="text-destructive">
                          Type <span className="font-semibold">{selectedTeam?.name}</span> to confirm
                        </Label>
                        <Input
                          id="confirm"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder={`Type "${selectedTeam?.name}" to confirm`}
                          className="border-destructive"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteSubmit}
                        disabled={deleteConfirmation !== selectedTeam?.name}
                      >
                        Delete Team
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Add Team Dialog */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Team</DialogTitle>
                      <DialogDescription>
                        Create a new team and assign it to a division.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-team-name">Team Name</Label>
                        <Input
                          id="new-team-name"
                          value={addFormData.name}
                          onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                          placeholder="Enter team name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-player1">Player 1</Label>
                        <Select
                          value={addFormData.player1Id}
                          onValueChange={(value) => setAddFormData({ ...addFormData, player1Id: value })}
                        >
                          <SelectTrigger id="new-player1">
                            <SelectValue placeholder="Select player 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-player2">Player 2 (Optional)</Label>
                        <Select
                          value={addFormData.player2Id}
                          onValueChange={(value) => setAddFormData({ ...addFormData, player2Id: value })}
                        >
                          <SelectTrigger id="new-player2">
                            <SelectValue placeholder="Select player 2 (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-division">Division</Label>
                        <Select
                          value={addFormData.divisionId}
                          onValueChange={(value) => setAddFormData({ ...addFormData, divisionId: value })}
                        >
                          <SelectTrigger id="new-division">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map((division) => (
                              <SelectItem key={division.id} value={division.id}>
                                {division.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddSubmit}
                        disabled={!addFormData.name || !addFormData.player1Id || !addFormData.divisionId}
                      >
                        Add Team
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Match Management
                </CardTitle>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setIsCreateMatchDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="whitespace-nowrap">Create Match</span>
                  </Button>
                  <Button
                    onClick={() => setIsGenerateMatchesDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    <span className="whitespace-nowrap sm:inline">Generate Matches</span>
                  </Button>
                  <Button
                    onClick={() => setIsClearMatchesDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span className="whitespace-nowrap">Clear All</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Matches Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Create matches between teams to get started.
                    </p>
                    <Button onClick={() => setIsCreateMatchDialogOpen(true)}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Create First Match
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Division Filter */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
                      <div className="text-sm font-medium">
                        {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} found
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="divisionFilter" className="text-sm whitespace-nowrap">
                          Filter by Division:
                        </Label>
                        <Select
                          value={selectedMatchDivision}
                          onValueChange={setSelectedMatchDivision}
                        >
                          <SelectTrigger id="divisionFilter" className="w-full sm:w-[180px]">
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
                      </div>
                    </div>

                    {/* Match Status Tabs */}
                    <Tabs value={matchesActiveTab} onValueChange={setMatchesActiveTab} className="mb-6">
                      <TabsList className="grid grid-cols-4 w-full max-w-md mb-4">
                        <TabsTrigger value="all">
                          All
                          <Badge variant="secondary" className="ml-2">{filteredMatches.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="pending">
                          Pending
                          <Badge variant="secondary" className="ml-2">{pendingMatches.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="upcoming">
                          Upcoming
                          <Badge variant="secondary" className="ml-2">{upcomingMatches.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                          Completed
                          <Badge variant="secondary" className="ml-2">{completedMatches.length}</Badge>
                        </TabsTrigger>
                      </TabsList>

                      {/* All Matches Tab */}
                      <TabsContent value="all">
                        {/* Mobile view (card-based layout) */}
                        <div className="grid gap-4 md:hidden">
                          {filteredMatches.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No matches found
                            </div>
                          ) : (
                            filteredMatches.map((match) => (
                              <div key={match.id} className="bg-card border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium">{match.team1?.name} vs {match.team2?.name}</h4>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {match.division?.name}
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      match.status === 'scheduled' ? 'default' :
                                        match.status === 'completed' ? 'secondary' :
                                          match.status === 'pending' ? 'destructive' : 'outline'
                                    }
                                    className="capitalize"
                                  >
                                    {match.status}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                  <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <div>{formatDate(match.scheduled_date)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Time:</span>
                                    <div>{match.scheduled_time || 'Not set'}</div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Venue:</span>
                                    <div>{match.venue || 'Not set'}</div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMatchClick(match)}
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteMatchClick(match)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Desktop view (table layout) */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Teams</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Venue</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredMatches.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">
                                    No matches found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredMatches.map((match) => (
                                  <TableRow key={match.id}>
                                    <TableCell>
                                      <div className="font-medium">{match.team1?.name} vs {match.team2?.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {match.division?.name}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div>{formatDate(match.scheduled_date)}</div>
                                      {match.scheduled_time && (
                                        <div className="text-xs text-muted-foreground">{match.scheduled_time}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {match.venue || <span className="text-muted-foreground text-sm">Not set</span>}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          match.status === 'scheduled' ? 'default' :
                                            match.status === 'completed' ? 'secondary' :
                                              match.status === 'pending' ? 'destructive' : 'outline'
                                        }
                                        className="capitalize"
                                      >
                                        {match.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditMatchClick(match)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteMatchClick(match)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {/* Pending Matches Tab */}
                      <TabsContent value="pending">
                        {/* Mobile view (card-based layout) */}
                        <div className="grid gap-4 md:hidden">
                          {pendingMatches.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No pending matches found
                            </div>
                          ) : (
                            pendingMatches.map((match) => (
                              <div key={match.id} className="bg-card border rounded-lg p-4 shadow-sm border-l-4 border-l-destructive">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium">{match.team1?.name} vs {match.team2?.name}</h4>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {match.division?.name}
                                    </div>
                                  </div>
                                  <Badge variant="destructive" className="capitalize">
                                    {match.status}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                  <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <div>{formatDate(match.scheduled_date)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Time:</span>
                                    <div>{match.scheduled_time || 'Not set'}</div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Venue:</span>
                                    <div>{match.venue || 'Not set'}</div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMatchClick(match)}
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteMatchClick(match)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Desktop view (table layout) */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Teams</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Venue</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingMatches.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">
                                    No pending matches found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                pendingMatches.map((match) => (
                                  <TableRow key={match.id}>
                                    <TableCell>
                                      <div className="font-medium">{match.team1?.name} vs {match.team2?.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {match.division?.name}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div>{formatDate(match.scheduled_date)}</div>
                                      {match.scheduled_time && (
                                        <div className="text-xs text-muted-foreground">{match.scheduled_time}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {match.venue || <span className="text-muted-foreground text-sm">Not set</span>}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="destructive" className="capitalize">
                                        {match.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditMatchClick(match)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteMatchClick(match)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {/* Upcoming Matches Tab */}
                      <TabsContent value="upcoming">
                        {/* Mobile view (card-based layout) */}
                        <div className="grid gap-4 md:hidden">
                          {upcomingMatches.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No upcoming matches found
                            </div>
                          ) : (
                            upcomingMatches.map((match) => (
                              <div key={match.id} className="bg-card border rounded-lg p-4 shadow-sm border-l-4 border-l-blue-500">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium">{match.team1?.name} vs {match.team2?.name}</h4>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {match.division?.name}
                                    </div>
                                  </div>
                                  <Badge variant="default" className="capitalize">
                                    {match.status}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                  <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <div>{formatDate(match.scheduled_date)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Time:</span>
                                    <div>{match.scheduled_time || 'Not set'}</div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Venue:</span>
                                    <div>{match.venue || 'Not set'}</div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMatchClick(match)}
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteMatchClick(match)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Desktop view (table layout) */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Teams</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Venue</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {upcomingMatches.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">
                                    No upcoming matches found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                upcomingMatches.map((match) => (
                                  <TableRow key={match.id}>
                                    <TableCell>
                                      <div className="font-medium">{match.team1?.name} vs {match.team2?.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {match.division?.name}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div>{formatDate(match.scheduled_date)}</div>
                                      {match.scheduled_time && (
                                        <div className="text-xs text-muted-foreground">{match.scheduled_time}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {match.venue || <span className="text-muted-foreground text-sm">Not set</span>}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="default" className="capitalize">
                                        {match.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditMatchClick(match)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteMatchClick(match)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {/* Completed Matches Tab */}
                      <TabsContent value="completed">
                        {/* Mobile view (card-based layout) */}
                        <div className="grid gap-4 md:hidden">
                          {completedMatches.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No completed matches found
                            </div>
                          ) : (
                            completedMatches.map((match) => (
                              <div key={match.id} className="bg-card border rounded-lg p-4 shadow-sm border-l-4 border-l-green-500">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium">{match.team1?.name} vs {match.team2?.name}</h4>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {match.division?.name}
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="capitalize">
                                    {match.status}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                  <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <div>{formatDate(match.scheduled_date)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Time:</span>
                                    <div>{match.scheduled_time || 'Not set'}</div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Venue:</span>
                                    <div>{match.venue || 'Not set'}</div>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMatchClick(match)}
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteMatchClick(match)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Desktop view (table layout) */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Teams</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Venue</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {completedMatches.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">
                                    No completed matches found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                completedMatches.map((match) => (
                                  <TableRow key={match.id}>
                                    <TableCell>
                                      <div className="font-medium">{match.team1?.name} vs {match.team2?.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {match.division?.name}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div>{formatDate(match.scheduled_date)}</div>
                                      {match.scheduled_time && (
                                        <div className="text-xs text-muted-foreground">{match.scheduled_time}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {match.venue || <span className="text-muted-foreground text-sm">Not set</span>}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="capitalize">
                                        {match.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditMatchClick(match)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeleteMatchClick(match)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Create Match Dialog */}
                <Dialog open={isCreateMatchDialogOpen} onOpenChange={setIsCreateMatchDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Match</DialogTitle>
                      <DialogDescription>
                        Schedule a match between two teams.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="division">Division</Label>
                        <Select
                          value={matchFormData.divisionId}
                          onValueChange={(value) => {
                            setMatchFormData({
                              ...matchFormData,
                              divisionId: value,
                              team1Id: '',
                              team2Id: ''
                            });
                            // Filter teams by selected division
                            const divisionTeams = teams.filter(team =>
                              team.division?.id === value
                            );
                            setFilteredTeams(divisionTeams);
                          }}
                        >
                          <SelectTrigger id="division">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map((division) => (
                              <SelectItem key={division.id} value={division.id}>
                                {division.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team1">Team 1</Label>
                        <Select
                          value={matchFormData.team1Id}
                          onValueChange={(value) => setMatchFormData({ ...matchFormData, team1Id: value })}
                          disabled={!matchFormData.divisionId}
                        >
                          <SelectTrigger id="team1">
                            <SelectValue placeholder="Select team 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredTeams.map((team) => (
                              <SelectItem
                                key={team.id}
                                value={team.id}
                                disabled={team.id === matchFormData.team2Id}
                              >
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team2">Team 2</Label>
                        <Select
                          value={matchFormData.team2Id}
                          onValueChange={(value) => setMatchFormData({ ...matchFormData, team2Id: value })}
                          disabled={!matchFormData.divisionId}
                        >
                          <SelectTrigger id="team2">
                            <SelectValue placeholder="Select team 2" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredTeams.map((team) => (
                              <SelectItem
                                key={team.id}
                                value={team.id}
                                disabled={team.id === matchFormData.team1Id}
                              >
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formatDateForInput(matchFormData.date)}
                          onChange={(e) => setMatchFormData({ ...matchFormData, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time (Optional)</Label>
                        <Input
                          id="time"
                          type="time"
                          value={matchFormData.time}
                          onChange={(e) => setMatchFormData({ ...matchFormData, time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="venue">Venue (Optional)</Label>
                        <Input
                          id="venue"
                          value={matchFormData.venue}
                          onChange={(e) => setMatchFormData({ ...matchFormData, venue: e.target.value })}
                          placeholder="Enter venue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={matchFormData.status}
                          onValueChange={(value) => setMatchFormData({ ...matchFormData, status: value })}
                        >
                          <SelectTrigger id="status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending Approval</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateMatchDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateMatchSubmit}
                        disabled={!matchFormData.team1Id || !matchFormData.team2Id || !matchFormData.date || !matchFormData.status}
                      >
                        Create Match
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Match Dialog */}
                <Dialog open={isEditMatchDialogOpen} onOpenChange={setIsEditMatchDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Match</DialogTitle>
                      <DialogDescription>
                        Update match details and schedule.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-division">Division</Label>
                        <Select
                          value={editMatchFormData.divisionId}
                          onValueChange={(value) => {
                            setEditMatchFormData({
                              ...editMatchFormData,
                              divisionId: value,
                              team1Id: '',
                              team2Id: ''
                            });
                            // Filter teams by selected division
                            const divisionTeams = teams.filter(team =>
                              team.division?.id === value
                            );
                            setFilteredTeams(divisionTeams);
                          }}
                        >
                          <SelectTrigger id="edit-division">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map((division) => (
                              <SelectItem key={division.id} value={division.id}>
                                {division.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-team1">Team 1</Label>
                        <Select
                          value={editMatchFormData.team1Id}
                          onValueChange={(value) => setEditMatchFormData({ ...editMatchFormData, team1Id: value })}
                        >
                          <SelectTrigger id="edit-team1">
                            <SelectValue placeholder="Select team 1" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredTeams.map((team) => (
                              <SelectItem
                                key={team.id}
                                value={team.id}
                                disabled={team.id === editMatchFormData.team2Id}
                              >
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-team2">Team 2</Label>
                        <Select
                          value={editMatchFormData.team2Id}
                          onValueChange={(value) => setEditMatchFormData({ ...editMatchFormData, team2Id: value })}
                        >
                          <SelectTrigger id="edit-team2">
                            <SelectValue placeholder="Select team 2" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredTeams.map((team) => (
                              <SelectItem
                                key={team.id}
                                value={team.id}
                                disabled={team.id === editMatchFormData.team1Id}
                              >
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-date">Date</Label>
                        <Input
                          id="edit-date"
                          type="date"
                          value={formatDateForInput(editMatchFormData.date)}
                          onChange={(e) => setEditMatchFormData({ ...editMatchFormData, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-time">Time (Optional)</Label>
                        <Input
                          id="edit-time"
                          type="time"
                          value={editMatchFormData.time}
                          onChange={(e) => setEditMatchFormData({ ...editMatchFormData, time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-venue">Venue (Optional)</Label>
                        <Input
                          id="edit-venue"
                          value={editMatchFormData.venue}
                          onChange={(e) => setEditMatchFormData({ ...editMatchFormData, venue: e.target.value })}
                          placeholder="Enter venue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-status">Status</Label>
                        <Select
                          value={editMatchFormData.status}
                          onValueChange={(value) => setEditMatchFormData({ ...editMatchFormData, status: value })}
                        >
                          <SelectTrigger id="edit-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending Approval</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditMatchDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEditMatchSubmit}
                        disabled={!editMatchFormData.team1Id || !editMatchFormData.team2Id || !editMatchFormData.date || !editMatchFormData.status}
                      >
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Delete Match Dialog */}
                <Dialog open={isDeleteMatchDialogOpen} onOpenChange={setIsDeleteMatchDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        Delete Match
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete the match.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {selectedMatch && (
                        <div className="space-y-2 border rounded-md p-4">
                          <div className="font-medium">{selectedMatch.team1?.name} vs {selectedMatch.team2?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(selectedMatch.scheduled_date)}
                            {selectedMatch.scheduled_time && ` at ${selectedMatch.scheduled_time}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Status: <span className="capitalize">{selectedMatch.status}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteMatchDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteMatchSubmit}
                      >
                        Delete Match
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Generate Division Matches Dialog */}
                <Dialog open={isGenerateMatchesDialogOpen} onOpenChange={setIsGenerateMatchesDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Generate Division Matches</DialogTitle>
                      <DialogDescription>
                        Automatically create matches between all teams in a division.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="generate-division">Select Division</Label>
                        <Select
                          value={generateMatchesFormData.divisionId}
                          onValueChange={(value) => setGenerateMatchesFormData({ divisionId: value })}
                        >
                          <SelectTrigger id="generate-division">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map((division) => (
                              <SelectItem key={division.id} value={division.id}>
                                {division.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="font-medium text-blue-800 mb-2">How this works:</h4>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal pl-4">
                          <li>Select a division to generate matches between all teams</li>
                          <li>Review the generated matches</li>
                          <li>Set schedule details (date, time, venue) for all matches</li>
                          <li>Players will receive these matches as "pending" for approval</li>
                        </ol>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsGenerateMatchesDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleGenerateMatches}
                        disabled={!generateMatchesFormData.divisionId}
                      >
                        Generate Matches
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Clear All Matches Dialog */}
                <Dialog open={isClearMatchesDialogOpen} onOpenChange={setIsClearMatchesDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        Clear All Matches
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete all matches in this league
                        and reset all team statistics to zero.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="bg-red-50 p-4 rounded-md">
                        <h4 className="font-medium text-red-800 mb-2">Warning:</h4>
                        <ul className="text-sm text-red-700 space-y-1 list-disc pl-4">
                          <li>All matches will be permanently deleted</li>
                          <li>All team statistics will be reset to zero</li>
                          <li>All match confirmations will be deleted</li>
                          <li>This action cannot be reversed</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clear-confirmation" className="text-destructive">
                          Type <span className="font-semibold">CLEAR ALL MATCHES</span> to confirm
                        </Label>
                        <Input
                          id="clear-confirmation"
                          value={clearMatchesConfirmation}
                          onChange={(e) => setClearMatchesConfirmation(e.target.value)}
                          placeholder="Type CLEAR ALL MATCHES to confirm"
                          className="border-destructive"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsClearMatchesDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleClearAllMatches}
                        disabled={clearMatchesConfirmation !== 'CLEAR ALL MATCHES'}
                      >
                        Clear All Matches
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Bulk Schedule Dialog */}
                <Dialog open={isBulkScheduleDialogOpen} onOpenChange={setIsBulkScheduleDialogOpen}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Schedule Generated Matches</DialogTitle>
                      <DialogDescription>
                        Set date, time, and venue for {generatedMatches.length} matches.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulk-date">Date</Label>
                        <Input
                          id="bulk-date"
                          type="date"
                          value={formatDateForInput(bulkScheduleFormData.date)}
                          onChange={(e) => setBulkScheduleFormData({ ...bulkScheduleFormData, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulk-time">Time (Optional)</Label>
                        <Input
                          id="bulk-time"
                          type="time"
                          value={bulkScheduleFormData.time}
                          onChange={(e) => setBulkScheduleFormData({ ...bulkScheduleFormData, time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulk-venue">Venue (Optional)</Label>
                        <Input
                          id="bulk-venue"
                          value={bulkScheduleFormData.venue}
                          onChange={(e) => setBulkScheduleFormData({ ...bulkScheduleFormData, venue: e.target.value })}
                          placeholder="Enter venue"
                        />
                      </div>

                      <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                        <h4 className="font-medium mb-2">Generated Matches:</h4>
                        <ul className="space-y-2">
                          {generatedMatches.map((match, index) => (
                            <li key={index} className="text-sm border-b pb-2">
                              {match.team1Name} vs {match.team2Name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkScheduleDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleBulkScheduleSubmit}
                        disabled={!bulkScheduleFormData.date}
                      >
                        Schedule All Matches
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            {leagueId && (
              <Leaderboard
                leagueId={leagueId}
                showDivisionFilter={true}
                compact={false}
              />
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  League Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {league && (
                  <LeagueSettingsForm league={league} leagueId={leagueId} onUpdate={fetchLeague} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManageLeague;


