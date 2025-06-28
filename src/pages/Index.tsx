
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, TrendingUp, Star, CheckCircle, LogOut, User } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [authModal, setAuthModal] = useState<'signin' | 'signup' | null>(null);
  const { user, profile, loading, signOut } = useAuth();

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
        <header className="border-b bg-background/80 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Padel League Ace
              </h1>
              <Badge className="bg-secondary text-secondary-foreground">
                {profile.role === 'super_admin' ? 'Super Admin' : 
                 profile.role === 'league_admin' ? 'League Admin' : 'Player'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{profile.full_name}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

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
                  <Button className="w-full gradient-padel text-white">
                    New League
                  </Button>
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
                <Button variant="outline" className="w-full">
                  View Teams
                </Button>
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
                <Button variant="outline" className="w-full">
                  View Schedule
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Leagues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Browse and join available leagues.
                </p>
                <Button variant="outline" className="w-full">
                  Browse Leagues
                </Button>
              </CardContent>
            </Card>
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
      color: "bg-gradient-to-br from-purple-500 to-purple-700"
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
      color: "bg-gradient-to-br from-blue-500 to-blue-700"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-secondary text-secondary-foreground px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              Professional Padel Management
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Padel League Ace
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              The complete platform for managing padel competitions, tournaments, and leagues. 
              From player registration to championship celebrations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="gradient-padel text-white hover:opacity-90 transition-opacity px-8 py-4 text-lg"
                onClick={() => setAuthModal('signup')}
              >
                Start Your League
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg"
                onClick={() => setAuthModal('signin')}
              >
                Sign In
              </Button>
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
