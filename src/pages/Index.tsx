import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, TrendingUp, Star, CheckCircle, LogOut, User } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Leaderboard from '@/components/Leaderboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const PlayerLeaderboard = ({ userId }: { userId: string }) => {
  const [playerLeagues, setPlayerLeagues] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    fetchPlayerLeagues();
  }, [userId]);

  // ENHANCED: Multiple event listeners for maximum compatibility
  useEffect(() => {
    let eventCount = 0;
    
    const createEventHandler = (eventName: string) => {
      return (event?: any) => {
        eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`🎾 PLAYERLEADERBOARD (${eventName}): Event #${eventCount} received at ${timestamp}`);
        console.log('Event details:', event?.detail || 'No details');
        
        // Multiple refresh strategies
        setLeaderboardKey(prev => {
          const newValue = prev + 1;
          console.log(`🔑 PlayerLeaderboard leaderboardKey changed from ${prev} to ${newValue}`);
          return newValue;
        });
        
        // Force a second refresh mechanism
        setForceRefresh(prev => prev + 1);
      };
    };

    // Event listener 1: Original scoreRecorded event
    const scoreRecordedHandler = createEventHandler('scoreRecorded');
    
    // Event listener 2: New leaderboardRefresh event
    const leaderboardRefreshHandler = createEventHandler('leaderboardRefresh');
    
    // Event listener 3: Global refresh event
    const globalRefreshHandler = createEventHandler('globalRefresh');

    console.log('🔧 PLAYERLEADERBOARD: Setting up multiple event listeners...');
    window.addEventListener('scoreRecorded', scoreRecordedHandler);
    window.addEventListener('leaderboardRefresh', leaderboardRefreshHandler);
    window.addEventListener('globalRefresh', globalRefreshHandler);
    
    // Register global refresh function for this component
    (window as any).refreshPlayerLeaderboard = scoreRecordedHandler;

    return () => {
      console.log('🧹 PLAYERLEADERBOARD: Cleaning up event listeners');
      window.removeEventListener('scoreRecorded', scoreRecordedHandler);
      window.removeEventListener('leaderboardRefresh', leaderboardRefreshHandler);
      window.removeEventListener('globalRefresh', globalRefreshHandler);
      
      if ((window as any).refreshPlayerLeaderboard) {
        delete (window as any).refreshPlayerLeaderboard;
      }
    };
  }, []);

  // Debug useEffect to track all state changes
  useEffect(() => {
    console.log('🔑 PlayerLeaderboard state changed:', {
      leaderboardKey,
      forceRefresh,
      selectedLeague,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [leaderboardKey, forceRefresh, selectedLeague]);

  const fetchPlayerLeagues = async () => {
    try {
      // Get teams where user is a player
      const { data: userTeams } = await supabase
        .from('teams')
        .select('id')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

      if (userTeams && userTeams.length > 0) {
        const teamIds = userTeams.map(team => team.id);

        // Get leagues where user's teams are registered
        const { data: registrations } = await supabase
          .from('league_registrations')
          .select('league_id')
          .in('team_id', teamIds);

        if (registrations && registrations.length > 0) {
          const leagueIds = registrations.map(reg => reg.league_id);

          // Get league details
          const { data: leagues } = await supabase
            .from('leagues')
            .select('id, name, status')
            .in('id', leagueIds)
            .order('created_at', { ascending: false });

          setPlayerLeagues(leagues || []);
          
          // Auto-select first active league
          const activeLeague = leagues?.find(l => l.status === 'active') || leagues?.[0];
          if (activeLeague) {
            setSelectedLeague(activeLeague.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching player leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Manual refresh function for testing
  const handleManualRefresh = () => {
    console.log('🔄 PLAYERLEADERBOARD: Manual refresh triggered');
    setLeaderboardKey(prev => prev + 1);
    setForceRefresh(prev => prev + 1);
  };

  if (loading) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            League Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-sm">Loading standings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (playerLeagues.length === 0) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            League Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2">No Active Leagues</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Join a league to see standings.
            </p>
            <Link to="/leagues">
              <Button variant="outline" size="sm">
                Browse Leagues
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-3">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            League Standings
            {/* Debug badges */}
            <Badge variant="outline" className="text-xs">
              Key: {leaderboardKey}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Refresh: {forceRefresh}
            </Badge>
          </CardTitle>
          
          <div className="flex gap-2">
            {playerLeagues.length > 1 && (
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select league" />
                </SelectTrigger>
                <SelectContent>
                  {playerLeagues.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Manual refresh button for testing */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              title="Manual refresh for testing"
            >
              🔄
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedLeague ? (
          <div className="space-y-4">
            {/* ENHANCED: Multiple ways to force refresh */}
            <Leaderboard 
              key={`${selectedLeague}-${leaderboardKey}-${forceRefresh}`} // Composite key
              leagueId={selectedLeague} 
              showDivisionFilter={true}
              maxEntries={undefined} // Show all teams
              compact={false} // Full leaderboard view
            />
            
            <div className="flex gap-2 pt-4 border-t">
              <Link to="/standings" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View All Standings
                </Button>
              </Link>
              <Link to="/matches" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  My Matches
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleManualRefresh}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {/* Debug info */}
            <div className="text-xs text-muted-foreground border-t pt-2">
              <div>League: {selectedLeague}</div>
              <div>Key: {leaderboardKey} | Force: {forceRefresh}</div>
              <div>Last update: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Select a league to view standings
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const Index = () => {
  const [authModal, setAuthModal] = useState<'signin' | 'signup' | null>(null);
  const { user, profile, loading, signOut } = useAuth();
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  // ENHANCED: Multiple event listeners in main component too
  useEffect(() => {
    let eventCount = 0;
    
    const createEventHandler = (eventName: string) => {
      return (event?: any) => {
        eventCount++;
        const timestamp = new Date().toLocaleTimeString();
        console.log(`🎾 MAIN INDEX (${eventName}): Event #${eventCount} received at ${timestamp}`);
        
        setLeaderboardKey(prev => {
          const newValue = prev + 1;
          console.log(`🔑 Main Index leaderboardKey changed from ${prev} to ${newValue}`);
          return newValue;
        });
      };
    };

    const scoreRecordedHandler = createEventHandler('scoreRecorded');
    const leaderboardRefreshHandler = createEventHandler('leaderboardRefresh');
    const globalRefreshHandler = createEventHandler('globalRefresh');
    
    console.log('🔧 MAIN INDEX: Setting up multiple event listeners');
    window.addEventListener('scoreRecorded', scoreRecordedHandler);
    window.addEventListener('leaderboardRefresh', leaderboardRefreshHandler);
    window.addEventListener('globalRefresh', globalRefreshHandler);
    
    return () => {
      console.log('🧹 MAIN INDEX: Cleaning up event listeners');
      window.removeEventListener('scoreRecorded', scoreRecordedHandler);
      window.removeEventListener('leaderboardRefresh', leaderboardRefreshHandler);
      window.removeEventListener('globalRefresh', globalRefreshHandler);
    };
  }, []);

  // Close modal when user successfully logs in
  useEffect(() => {
    if (user && authModal) {
      setAuthModal(null);
    }
  }, [user, authModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show dashboard for authenticated users
  if (user && profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
        {/* Header */}
        <Header />
        {/* Dashboard Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome back, {profile.full_name}!</h2>
            <p className="text-muted-foreground">
              {profile.role === 'super_admin' ? 'You have full system access.' :
               profile.role === 'league_admin' && !profile.is_approved ? 'Your account is pending approval to create leagues.' :
               profile.role === 'league_admin' ? 'You can create and manage leagues.' :
               'Join leagues and form teams to start competing.'}
            </p>
          </div>

          {/* Role-specific dashboard cards */}
          {profile.role === 'super_admin' && (
            <>
              <Card className="hover:shadow-lg transition-shadow border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Admin Panel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Manage users, approve League Administrators, and system settings.
                  </p>
                  <Link to="/admin">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                      Open Admin Panel
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-yellow-600" />
                    Pending Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Review and approve League Administrator applications.
                  </p>
                  <Link to="/admin">
                    <Button variant="outline" className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                      Review Applications
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )}
          
          <div className="space-y-6">
            {/* League Standings - shows if user has teams in leagues */}
            <PlayerLeaderboard key={leaderboardKey} userId={profile.id} />

            {/* Regular dashboard cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.role === 'league_admin' && profile.is_approved && (
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      Create League
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Set up a new padel league with custom divisions and rules.
                    </p>
                    <Link to="/create-league">
                      <Button className="w-full gradient-padel text-white">
                        New League
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    My Teams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    View and manage your padel teams.
                  </p>
                  <Link to="/teams">
                    <Button variant="outline" className="w-full">
                      View Teams
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Matches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Check your scheduled matches and results.
                  </p>
                  <Link to="/matches">
                    <Button variant="outline" className="w-full">
                      View Schedule
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Browse Leagues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Find and join new padel leagues.
                  </p>
                  <Link to="/leagues">
                    <Button variant="outline" className="w-full">
                      Browse Leagues
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Approval notice for league admins */}
          {profile.role === 'league_admin' && !profile.is_approved && (
            <Card className="mt-6 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">Account Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700">
                  Your League Administrator account is currently pending approval. Once approved by a Super Admin, 
                  you'll be able to create and manage leagues.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  const features = [
    {
      icon: Trophy,
      title: "Tournament Management",
      description: "Create and manage professional padel tournaments with custom divisions and rules."
    },
    {
      icon: Users,
      title: "Team Formation",
      description: "Form teams, invite partners, and join multiple leagues with seamless coordination."
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Automated match scheduling with flexible rescheduling and conflict resolution."
    },
    {
      icon: TrendingUp,
      title: "Live Rankings",
      description: "Real-time standings, statistics, and performance tracking for all participants."
    }
  ];

  const userRoles = [
    {
      title: "Super Admin",
      description: "Complete system control with override capabilities",
      features: ["Manage all accounts", "System-wide settings", "Override restrictions", "Global analytics"],
      color: "bg-gradient-to-br from-orange-600 to-orange-800"
    },
    {
      title: "League Admin",
      description: "Create and manage padel leagues and tournaments",
      features: ["Create leagues", "Manage divisions", "Schedule matches", "Approve registrations"],
      color: "gradient-padel"
    },
    {
      title: "Player",
      description: "Join leagues, form teams, and compete",
      features: ["Join multiple leagues", "Create teams", "Log match results", "View statistics"],
      color: "bg-gradient-to-br from-amber-500 to-amber-700"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 py-8 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Left side - Text content */}
            <div className="md:w-1/2 text-center md:text-left">
              <Badge className="mb-6 bg-secondary text-secondary-foreground px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                Professional Padel Management
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Padel League Ace
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                The complete platform for managing padel competitions, tournaments, and leagues. 
                From player registration to championship celebrations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="gradient-padel text-white hover:opacity-90 transition-opacity px-6 py-3 text-base"
                  onClick={() => setAuthModal('signup')}
                >
                  Sign Up as Player
                </Button>
                <Button 
                  size="lg" 
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 text-base"
                  onClick={() => setAuthModal('signup')}
                >
                  Create a League
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-primary hover:bg-primary hover:text-primary-foreground px-6 py-3 text-base"
                  onClick={() => setAuthModal('signin')}
                >
                  Sign In
                </Button>
              </div>
            </div>
            
            {/* Right side - Image */}
            <div className="md:w-1/2 mt-8 md:mt-0">
              <img 
                src="/padel-hero.svg" 
                alt="Padel players on court" 
                className="w-full h-auto max-w-lg mx-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for organizing professional padel competitions
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-card/50 backdrop-blur">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto mb-4 gradient-padel rounded-full flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Choose Your Role</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Different access levels designed for every type of padel enthusiast
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {userRoles.map((role, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-full h-32 ${role.color} rounded-lg mb-4 flex items-center justify-center`}>
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{role.title}</CardTitle>
                  <CardDescription className="text-base">{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {role.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-padel">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of padel players and administrators who trust Padel League Ace
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg"
              onClick={() => setAuthModal('signup')}
            >
              Create Account
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-4 text-lg"
              onClick={() => setAuthModal('signin')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Padel League Ace
          </h3>
          <p className="text-muted-foreground">
            The professional choice for padel tournament management
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModal && (
        <AuthModal 
          type={authModal} 
          onClose={() => setAuthModal(null)}
          onSwitchType={(type) => setAuthModal(type)}
        />
      )}
    </div>
  );
};

export default Index;