import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CheckCircle, XCircle, Mail, Calendar, Shield, Trophy, Pencil, Eye, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Link } from 'react-router-dom';

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  created_at: string;
}

const AdminPanel = () => {
  const { profile } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Redirect if not super admin
  useEffect(() => {
    if (profile && profile.role !== 'super_admin') {
      window.location.href = '/';
    }
  }, [profile]);

  // Fetch pending League Administrator approvals
  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, country, created_at')
        .eq('role', 'league_admin')
        .eq('is_approved', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApproval = async (userId: string, approved: boolean) => {
    setActionLoading(userId);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: approved })
        .eq('id', userId);

      if (error) throw error;

      // Remove from pending list
      setPendingUsers(users => users.filter(user => user.id !== userId));
      
      setMessage(approved ? 'League Administrator approved successfully!' : 'Application rejected.');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating approval status:', error);
      setMessage('Error processing request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (profile?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You need Super Admin privileges to access this page.</p>
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
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
            <h2 className="text-3xl font-bold">Super Admin Panel</h2>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              System Administrator
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage League Administrator approvals and system oversight.
          </p>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.includes('Error') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={message.includes('Error') ? 'text-red-700' : 'text-green-700'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Approvals Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="text-2xl font-bold">Pending League Administrator Approvals</h3>
            <Badge variant="secondary">{pendingUsers.length}</Badge>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading pending approvals...</span>
                </div>
              </CardContent>
            </Card>
          ) : pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="font-semibold mb-2">No Pending Approvals</h3>
                <p className="text-sm text-muted-foreground">
                  All League Administrator applications have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-lg font-semibold">{user.full_name}</h4>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Applied: {new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                          {user.phone && (
                            <div>
                              <span>Phone: {user.phone}</span>
                            </div>
                          )}
                          {user.country && (
                            <div>
                              <span>Country: {user.country}</span>
                            </div>
                          )}
                        </div>
                        
                        <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                          League Administrator Application
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproval(user.id, false)}
                          disabled={actionLoading === user.id}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproval(user.id, true)}
                          disabled={actionLoading === user.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {actionLoading === user.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* All Leagues Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-orange-600" />
            <h3 className="text-2xl font-bold">All Leagues</h3>
          </div>
          
          <AllLeaguesSection />
        </div>

        {/* System Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">-</div>
              <p className="text-sm text-muted-foreground">System-wide users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Active Leagues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">-</div>
              <p className="text-sm text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</div>
              <p className="text-sm text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// All Leagues Section Component
interface League {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  created_by: string;
  is_approved?: boolean;
  registration_deadline?: string;
  max_teams_per_division?: number;
  match_format?: string;
  entry_fee?: number;
  currency?: string;
  creator?: {
    full_name: string;
    email: string;
  };
  divisions_count?: number;
  teams_count?: number;
}

const AllLeaguesSection = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leagueToDelete, setLeagueToDelete] = useState<League | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'delete' | 'changeStatus' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>('active');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllLeagues = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all leagues with creator information
        const { data, error } = await supabase
          .from('leagues')
          .select(`
            *,
            creator:profiles!leagues_created_by_fkey(full_name, email)
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Get division counts for each league
        const leaguesWithCounts = await Promise.all((data || []).map(async (league) => {
          // Get divisions count
          const { count: divisionsCount, error: divError } = await supabase
            .from('divisions')
            .select('id', { count: 'exact', head: true })
            .eq('league_id', league.id);
          
          if (divError) console.error('Error fetching divisions count:', divError);
          
          // Get teams count
          const { count: teamsCount, error: teamsError } = await supabase
            .from('league_registrations')
            .select('id', { count: 'exact', head: true })
            .eq('league_id', league.id);
          
          if (teamsError) console.error('Error fetching teams count:', teamsError);
          
          return {
            ...league,
            divisions_count: divisionsCount || 0,
            teams_count: teamsCount || 0
          };
        }));
        
        setLeagues(leaguesWithCounts);
      } catch (err) {
        console.error('Error fetching leagues:', err);
        setError('Failed to load leagues. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllLeagues();
  }, []);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading leagues...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">Error</p>
          </div>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (leagues.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Leagues Found</h3>
          <p className="text-sm text-muted-foreground">
            No leagues have been created yet.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Handle quick edit of a league
  const handleQuickEdit = (league: League) => {
    setEditingLeague(league);
    setIsEditDialogOpen(true);
  };

  // Handle delete league
  const handleDeleteLeague = (league: League) => {
    setLeagueToDelete(league);
    setIsDeleteDialogOpen(true);
  };

  // Handle league approval
  const handleApproveLeague = async (leagueId: string, approved: boolean) => {
    setActionLoading(leagueId);
    try {
      const { error } = await supabase
        .from('leagues')
        .update({ is_approved: approved })
        .eq('id', leagueId);

      if (error) throw error;

      // Update local state
      setLeagues(leagues.map(league => 
        league.id === leagueId ? { ...league, is_approved: approved } : league
      ));

      setMessage(approved ? 'League approved successfully!' : 'League approval revoked.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error updating league approval:', err);
      setMessage('Error updating league approval. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle bulk selection
  const handleSelectLeague = (leagueId: string, selected: boolean) => {
    if (selected) {
      setSelectedLeagues([...selectedLeagues, leagueId]);
    } else {
      setSelectedLeagues(selectedLeagues.filter(id => id !== leagueId));
    }
  };

  // Handle bulk select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLeagues(leagues.map(league => league.id));
    } else {
      setSelectedLeagues([]);
    }
  };

  // Handle bulk action
  const handleBulkAction = (action: 'approve' | 'delete' | 'changeStatus') => {
    setBulkAction(action);
    setIsBulkActionDialogOpen(true);
  };

  // Execute bulk action
  const executeBulkAction = async () => {
    if (!bulkAction || selectedLeagues.length === 0) return;

    setActionLoading('bulk');
    try {
      switch (bulkAction) {
        case 'approve':
          await supabase
            .from('leagues')
            .update({ is_approved: true })
            .in('id', selectedLeagues);
          
          setLeagues(leagues.map(league => 
            selectedLeagues.includes(league.id) ? { ...league, is_approved: true } : league
          ));
          setMessage(`${selectedLeagues.length} leagues approved successfully!`);
          break;
          
        case 'delete':
          // First check if any leagues have teams
          const leaguesToDelete = leagues.filter(league => 
            selectedLeagues.includes(league.id) && (league.teams_count || 0) === 0
          );
          
          if (leaguesToDelete.length !== selectedLeagues.length) {
            setMessage('Some leagues could not be deleted because they have registered teams.');
          }
          
          if (leaguesToDelete.length > 0) {
            // Delete divisions first
            await supabase
              .from('divisions')
              .delete()
              .in('league_id', leaguesToDelete.map(l => l.id));
              
            // Then delete leagues
            await supabase
              .from('leagues')
              .delete()
              .in('id', leaguesToDelete.map(l => l.id));
            
            setLeagues(leagues.filter(league => !leaguesToDelete.map(l => l.id).includes(league.id)));
            setMessage(`${leaguesToDelete.length} leagues deleted successfully!`);
          }
          break;
          
        case 'changeStatus':
          await supabase
            .from('leagues')
            .update({ status: bulkStatus })
            .in('id', selectedLeagues);
          
          setLeagues(leagues.map(league => 
            selectedLeagues.includes(league.id) ? { ...league, status: bulkStatus } : league
          ));
          setMessage(`Status updated for ${selectedLeagues.length} leagues!`);
          break;
      }
      
      setSelectedLeagues([]);
      setIsBulkActionDialogOpen(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error executing bulk action:', err);
      setMessage('Error executing bulk action. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Save edited league
  const saveEditedLeague = async () => {
    if (!editingLeague) return;
    
    setActionLoading(editingLeague.id);
    try {
      const { error } = await supabase
        .from('leagues')
        .update({
          name: editingLeague.name,
          description: editingLeague.description,
          status: editingLeague.status,
          start_date: editingLeague.start_date,
          end_date: editingLeague.end_date
        })
        .eq('id', editingLeague.id);

      if (error) throw error;

      // Update local state
      setLeagues(leagues.map(league => 
        league.id === editingLeague.id ? { ...league, ...editingLeague } : league
      ));

      setIsEditDialogOpen(false);
      setMessage('League updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error updating league:', err);
      setMessage('Error updating league. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete league confirmation
  const confirmDeleteLeague = async () => {
    if (!leagueToDelete) return;
    
    setActionLoading(leagueToDelete.id);
    try {
      // Check if league has teams
      if ((leagueToDelete.teams_count || 0) > 0) {
        setMessage(`Cannot delete league "${leagueToDelete.name}" because it has registered teams.`);
        setIsDeleteDialogOpen(false);
        setActionLoading(null);
        return;
      }
      
      // Delete divisions first
      await supabase
        .from('divisions')
        .delete()
        .eq('league_id', leagueToDelete.id);
        
      // Then delete league
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueToDelete.id);

      if (error) throw error;

      // Update local state
      setLeagues(leagues.filter(league => league.id !== leagueToDelete.id));

      setIsDeleteDialogOpen(false);
      setMessage(`League "${leagueToDelete.name}" deleted successfully!`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting league:', err);
      setMessage('Error deleting league. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-2 py-1">
                {leagues.length} Leagues
              </Badge>
              {selectedLeagues.length > 0 && (
                <Badge className="bg-blue-100 text-blue-800 px-2 py-1">
                  {selectedLeagues.length} Selected
                </Badge>
              )}
              {message && (
                <div className="text-sm font-medium text-green-600">{message}</div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {selectedLeagues.length > 0 ? (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleBulkAction('approve')}
                    disabled={actionLoading === 'bulk'}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve Selected
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleBulkAction('changeStatus')}
                    disabled={actionLoading === 'bulk'}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Change Status
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleBulkAction('delete')}
                    disabled={actionLoading === 'bulk'}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setSelectedLeagues([])}
                  >
                    Clear Selection
                  </Button>
                </>
              ) : (
                <Link to="/create-league">
                  <Button size="sm" className="gradient-padel text-white">
                    <Trophy className="w-4 h-4 mr-1" />
                    Create New League
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input 
                    type="checkbox" 
                    checked={selectedLeagues.length === leagues.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4"
                  />
                </TableHead>
                <TableHead>League Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Divisions</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leagues.map((league) => (
                <TableRow key={league.id}>
                  <TableCell>
                    <input 
                      type="checkbox" 
                      checked={selectedLeagues.includes(league.id)}
                      onChange={(e) => handleSelectLeague(league.id, e.target.checked)}
                      className="w-4 h-4"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{league.name}</div>
                    {league.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {league.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(league.status)}
                    {league.is_approved === false && (
                      <Badge className="bg-yellow-100 text-yellow-800 ml-2">Pending Approval</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(league.start_date).toLocaleDateString()} - {new Date(league.end_date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{league.creator?.full_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{league.creator?.email}</div>
                  </TableCell>
                  <TableCell>{league.divisions_count}</TableCell>
                  <TableCell>{league.teams_count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {league.is_approved === false && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleApproveLeague(league.id, true)}
                          disabled={actionLoading === league.id}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleQuickEdit(league)}
                        disabled={actionLoading === league.id}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteLeague(league)}
                        disabled={actionLoading === league.id}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Link to={`/manage-league/${league.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Quick Edit Dialog */}
      {editingLeague && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit League</DialogTitle>
              <DialogDescription>
                Make quick changes to the league details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">League Name</Label>
                <Input
                  id="name"
                  value={editingLeague.name}
                  onChange={(e) => setEditingLeague({...editingLeague, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editingLeague.description || ''}
                  onChange={(e) => setEditingLeague({...editingLeague, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={editingLeague.start_date}
                    onChange={(e) => setEditingLeague({...editingLeague, start_date: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={editingLeague.end_date}
                    onChange={(e) => setEditingLeague({...editingLeague, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editingLeague.status} 
                  onValueChange={(value) => setEditingLeague({...editingLeague, status: value})}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={saveEditedLeague}
                disabled={actionLoading === editingLeague.id}
              >
                {actionLoading === editingLeague.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete League Dialog */}
      {leagueToDelete && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete League</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this league? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="font-medium">{leagueToDelete.name}</p>
              {(leagueToDelete.teams_count || 0) > 0 && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                  <AlertCircle className="w-4 h-4 inline-block mr-1" />
                  This league has {leagueToDelete.teams_count} registered teams. You cannot delete it.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteLeague}
                disabled={actionLoading === leagueToDelete.id || (leagueToDelete.teams_count || 0) > 0}
              >
                {actionLoading === leagueToDelete.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : 'Delete League'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'approve' ? 'Approve Leagues' : 
               bulkAction === 'delete' ? 'Delete Leagues' : 
               'Change League Status'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'approve' ? 'Approve all selected leagues?' : 
               bulkAction === 'delete' ? 'Delete all selected leagues? This action cannot be undone.' : 
               'Change the status of all selected leagues?'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2">{selectedLeagues.length} leagues selected</p>
            
            {bulkAction === 'changeStatus' && (
              <div className="grid gap-2">
                <Label htmlFor="bulkStatus">New Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger id="bulkStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
              disabled={actionLoading === 'bulk'}
            >
              {actionLoading === 'bulk' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : bulkAction === 'approve' ? 'Approve Leagues' : 
                 bulkAction === 'delete' ? 'Delete Leagues' : 
                 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPanel;