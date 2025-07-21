import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Mail, Loader2, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sendTeamInvitationEmail } from '@/utils/emailService';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';

const CreateTeam = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    teamName: '',
    teammateEmail: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.teamName.trim()) {
        throw new Error('Team name is required');
      }
      if (!formData.teammateEmail.trim()) {
        throw new Error('Teammate email is required');
      }
      if (formData.teammateEmail === profile?.email) {
        throw new Error('You cannot invite yourself to a team');
      }

      // Check if teammate exists in the system
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', formData.teammateEmail.trim())
        .single();

      if (existingUser) {
        // Create team with both players immediately
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: formData.teamName.trim(),
            player1_id: profile?.id,
            player2_id: existingUser.id,
            created_by: profile?.id
          })
          .select()
          .single();

        if (teamError) throw teamError;
        
        // Send email notification to the existing user who was added to the team
        try {
          await sendTeamInvitationEmail(
            existingUser.email,
            formData.teamName.trim(),
            profile?.full_name || 'Team Captain'
          );
          console.log('Team addition email sent successfully to existing user');
        } catch (emailError) {
          console.error('Failed to send team addition email:', emailError);
          // Don't throw error here, as the team was created successfully
        }
      } else {
        // Create team with only player1, send invitation for player2
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: formData.teamName.trim(),
            player1_id: profile?.id,
            player2_id: null, // Will be filled when invitation is accepted
            created_by: profile?.id
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Create invitation for non-existing user
        const { error: inviteError } = await supabase
          .from('team_invitations')
          .insert({
            team_id: team.id,
            email: formData.teammateEmail.trim(),
            invited_by: profile?.id,
            status: 'pending'
          });

        if (inviteError) throw inviteError;
        
        // Send email notification to the invited teammate
        try {
          await sendTeamInvitationEmail(
            formData.teammateEmail.trim(),
            formData.teamName.trim(),
            profile?.full_name || 'Team Captain'
          );
          console.log('Team invitation email sent successfully');
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't throw error here, as the team and invitation were created successfully
        }
      }

      setSuccess(true);
      
      // Redirect to teams page after 2 seconds
      setTimeout(() => {
        navigate('/teams');
      }, 2000);

    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not a player
  if (!profile || profile.role !== 'player') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-muted-foreground">Only players can create teams.</p>
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
              <Users className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">Team Created Successfully!</h2>
              <p className="text-muted-foreground mb-4">
                Your padel team "{formData.teamName}" has been created.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to your teams...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
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
              <h2 className="text-3xl font-bold mb-2">Create New Team</h2>
              <p className="text-muted-foreground">
                Form a padel team with your playing partner
              </p>
            </div>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    value={formData.teamName}
                    onChange={(e) => handleInputChange('teamName', e.target.value)}
                    placeholder="Thunder Padel, Court Kings, etc."
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a memorable name for your team
                  </p>
                </div>

                <div>
                  <Label htmlFor="teammateEmail">Teammate Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="teammateEmail"
                      type="email"
                      value={formData.teammateEmail}
                      onChange={(e) => handleInputChange('teammateEmail', e.target.value)}
                      placeholder="teammate@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your teammate will be added immediately if they have an account, or invited to join if they need to register first.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Padel Team Rules</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Each team consists of exactly 2 players</li>
                    <li>• You will be the team captain and can manage the team</li>
                    <li>• Teams can register for leagues and be assigned to divisions</li>
                    <li>• Both players must be available for scheduled matches</li>
                    <li>• Teams can join multiple leagues simultaneously</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/teams')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-padel text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Team...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Team
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeam;