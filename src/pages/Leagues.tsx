import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

interface League {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_at: string | null;
  created_by: string;
  match_format: string | null;
  max_teams_per_division: number | null;
  status: string;
  updated_at: string | null;
}

const Leagues = () => {
  const { profile } = useAuth();
  const [availableLeagues, setAvailableLeagues] = useState<League[]>([]);
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeagues = async () => {
        if (!profile) return;

        try {
          // Get all leagues first
          const { data: allLeagues, error: leaguesError } = await supabase
            .from('leagues')
            .select('*')
            .order('created_at', { ascending: false });

          if (leaguesError) throw leaguesError;

          let myLeagues = [];
          let availableLeagues = [];

          if (profile.role === 'league_admin') {
            // For League Admins: My Leagues = leagues they created
            myLeagues = allLeagues?.filter(league => league.created_by === profile.id) || [];
            // Available Leagues = leagues created by other admins
            availableLeagues = allLeagues?.filter(league => league.created_by !== profile.id) || [];
            
          } else {
            // For Players: My Leagues = leagues their teams are registered for
            const { data: userTeams, error: teamsError } = await supabase
              .from('teams')
              .select('id')
              .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`);

            if (teamsError) throw teamsError;

            const teamIds = userTeams?.map(team => team.id) || [];

            const { data: registrations, error: regError } = await supabase
              .from('league_registrations')
              .select('league_id')
              .in('team_id', teamIds);

            if (regError) throw regError;

            const registeredLeagueIds = registrations?.map(reg => reg.league_id) || [];
            
            myLeagues = allLeagues?.filter(league => 
              registeredLeagueIds.includes(league.id)
            ) || [];
            
            availableLeagues = allLeagues?.filter(league => 
              !registeredLeagueIds.includes(league.id)
            ) || [];
          }

          setMyLeagues(myLeagues);
          setAvailableLeagues(availableLeagues);
          
        } catch (error) {
          console.error('Error fetching leagues:', error);
        } finally {
          setLoading(false);
        }
      };

    fetchLeagues();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading leagues...</p>
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
              <h2 className="text-3xl font-bold mb-2">Padel Leagues</h2>
              <p className="text-muted-foreground">
                Join competitive leagues and track your progress
              </p>
            </div>
            {profile?.role === 'league_admin' && profile?.is_approved && (
              <Link to="/create-league">
                <Button className="gradient-padel text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Create League
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* My Leagues */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4">My Leagues</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLeagues.length > 0 ? (
              myLeagues.map((league) => (
                <Card key={league.id} className="hover:shadow-lg transition-shadow border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      {league.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{league.status}</Badge>
                        <Badge className="bg-blue-100 text-blue-800">Created by You</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Start Date:</span>
                          <span className="font-medium">{new Date(league.start_date).toLocaleDateString()}</span>
                        </div>
                        {league.max_teams_per_division && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Max Teams per Division:</span>
                            <span className="font-medium">{league.max_teams_per_division}</span>
                          </div>
                        )}
                        {league.match_format && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Match Format:</span>
                            <span className="font-medium">{league.match_format}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-2">
                        <Link to={`/manage-league/${league.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Manage League
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-2 col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Leagues Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {profile?.role === 'league_admin' && profile?.is_approved 
                      ? "Create your first league to get started"
                      : "Join a league below to start competing"
                    }
                  </p>
                  {profile?.role === 'league_admin' && profile?.is_approved && (
                    <Link to="/create-league">
                      <Button variant="outline">
                        <Trophy className="w-4 h-4 mr-2" />
                        Create League
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Available Leagues */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Available Leagues</h3>
          <div className="space-y-6">
            {availableLeagues.length > 0 ? (
              availableLeagues.map((league) => (
                <Card key={league.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-4 flex-1">
                        <div>
                          <div className="flex items-center gap-4 mb-2">
                            <h4 className="text-xl font-bold">{league.name}</h4>
                            <Badge className="bg-green-100 text-green-800">
                              {league.status === 'draft' ? 'Coming Soon' : 
                               league.status === 'open' ? 'Registration Open' : 
                               league.status}
                            </Badge>
                          </div>
                          {league.description && (
                            <p className="text-muted-foreground">{league.description}</p>
                          )}
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <p className="font-medium">
                              {new Date(league.start_date).toLocaleDateString()} - {new Date(league.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          {league.max_teams_per_division && (
                            <div>
                              <span className="text-muted-foreground">Max Teams per Division:</span>
                              <p className="font-medium">{league.max_teams_per_division}</p>
                            </div>
                          )}
                          {league.match_format && (
                            <div>
                              <span className="text-muted-foreground">Match Format:</span>
                              <p className="font-medium">{league.match_format}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-6">
                        <Link to="/teams">
                          <Button className="gradient-padel text-white">
                            Join League
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Leagues Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Check back later for new league announcements
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leagues;
