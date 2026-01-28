import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, Calendar, Users, MapPin, DollarSign, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const CreateLeague = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    maxTeams: '32',
    entryFee: '',
    venue: '',
    matchFormat: 'best_of_3',
    divisions: ['Division A', 'Division B'] // Default divisions
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate dates
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const registrationDeadline = new Date(formData.registrationDeadline);

      if (registrationDeadline >= startDate) {
        throw new Error('Registration deadline must be before the start date');
      }
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      // Create the league
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert({
          name: formData.name,
          description: formData.description,
          start_date: formData.startDate,
          end_date: formData.endDate,
          registration_deadline: formData.registrationDeadline,
          max_teams: parseInt(formData.maxTeams),
          entry_fee: formData.entryFee ? parseFloat(formData.entryFee) : null,
          venue: formData.venue,
          match_format: formData.matchFormat,
          created_by: profile?.id,
          status: 'draft' // Draft status means it requires super admin approval
        })
        .select()
        .single();

      if (leagueError) throw leagueError;

      // Create default divisions
      const divisionsToCreate = formData.divisions.map((divisionName, index) => ({
        league_id: league.id,
        name: divisionName,
        level: index + 1,
        max_teams: Math.ceil(parseInt(formData.maxTeams) / formData.divisions.length)
      }));

      const { error: divisionsError } = await supabase
        .from('divisions')
        .insert(divisionsToCreate);

      if (divisionsError) throw divisionsError;

      setSuccess(true);
      
      // Redirect to leagues page after 2 seconds
      setTimeout(() => {
        window.location.href = '/leagues';
      }, 2000);

    } catch (err: any) {
      console.error('Error creating league:', err);
      setError(err.message || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not approved league admin
  if (!profile || profile.role !== 'league_admin' || !profile.is_approved) {
    return (
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-muted-foreground">You need to be an approved League Administrator to create leagues.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">League Created Successfully!</h2>
            <p className="text-muted-foreground mb-4">
              Your padel league has been created and is now pending approval from a Super Admin.
            </p>
            <p className="text-muted-foreground mb-4">
              Once approved, your league will be activated and ready for team registrations.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to leagues page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Create New Padel League</h2>
          <p className="text-muted-foreground">
            Set up a new competitive padel league for your community
          </p>
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
                  <Trophy className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">League Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Summer Padel Championship 2025"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your league, rules, and what makes it special..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="venue">Venue/Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="venue"
                      value={formData.venue}
                      onChange={(e) => handleInputChange('venue', e.target.value)}
                      placeholder="Main venue or general location"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Schedule & Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="registrationDeadline">Registration Deadline *</Label>
                  <Input
                    id="registrationDeadline"
                    type="date"
                    value={formData.registrationDeadline}
                    onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  League Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxTeams">Maximum Teams</Label>
                    <Select
                      value={formData.maxTeams}
                      onValueChange={(value) => handleInputChange('maxTeams', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16">16 Teams</SelectItem>
                        <SelectItem value="24">24 Teams</SelectItem>
                        <SelectItem value="32">32 Teams</SelectItem>
                        <SelectItem value="48">48 Teams</SelectItem>
                        <SelectItem value="64">64 Teams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="matchFormat">Match Format</Label>
                    <Select
                      value={formData.matchFormat}
                      onValueChange={(value) => handleInputChange('matchFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="best_of_3">Best of 3 Sets</SelectItem>
                        <SelectItem value="best_of_5">Best of 5 Sets</SelectItem>
                        <SelectItem value="single_set">Single Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="entryFee">Entry Fee (Optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="entryFee"
                      type="number"
                      step="0.01"
                      value={formData.entryFee}
                      onChange={(e) => handleInputChange('entryFee', e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="mb-2 block">Divisions</Label>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="numDivisions" className="text-sm text-muted-foreground">Number of Divisions</Label>
                      <Select
                        value={formData.divisions.length.toString()}
                        onValueChange={(value) => {
                          const numDivisions = parseInt(value);
                          const currentDivisions = [...formData.divisions];
                          const defaultDivisionNames = ['Division A', 'Division B', 'Division C', 'Division D', 'Division E', 'Division F'];
                          
                          // If increasing divisions, add new ones with default names
                          if (numDivisions > currentDivisions.length) {
                            const newDivisions = [...currentDivisions];
                            for (let i = currentDivisions.length; i < numDivisions; i++) {
                              newDivisions.push(defaultDivisionNames[i] || `Division ${i + 1}`);
                            }
                            setFormData(prev => ({ ...prev, divisions: newDivisions }));
                          } 
                          // If decreasing divisions, remove from the end
                          else if (numDivisions < currentDivisions.length) {
                            setFormData(prev => ({ 
                              ...prev, 
                              divisions: currentDivisions.slice(0, numDivisions) 
                            }));
                          }
                        }}
                      >
                        <SelectTrigger id="numDivisions">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Division</SelectItem>
                          <SelectItem value="2">2 Divisions</SelectItem>
                          <SelectItem value="3">3 Divisions</SelectItem>
                          <SelectItem value="4">4 Divisions</SelectItem>
                          <SelectItem value="5">5 Divisions</SelectItem>
                          <SelectItem value="6">6 Divisions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Teams per Division (Approx.)</Label>
                      <div className="h-10 px-4 py-2 border rounded-md bg-muted/50 text-sm">
                        {Math.ceil(parseInt(formData.maxTeams) / formData.divisions.length)} teams
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Division Names</Label>
                    {formData.divisions.map((division, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={division}
                          onChange={(e) => {
                            const newDivisions = [...formData.divisions];
                            newDivisions[index] = e.target.value;
                            setFormData(prev => ({ ...prev, divisions: newDivisions }));
                          }}
                          placeholder={`Division ${index + 1}`}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          (Level {index + 1})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-padel text-white"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create League
              </Button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default CreateLeague;