import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CheckCircle, XCircle, Mail, Calendar, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

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

export default AdminPanel;