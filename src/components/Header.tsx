import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, LogOut, Home, Users, Calendar, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const navigationTabs = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/teams', label: 'Teams', icon: Users },
    { path: '/matches', label: 'Matches', icon: Calendar },
    { path: '/leagues', label: 'Leagues', icon: Trophy },
  ];

  if (profile?.role === 'super_admin') {
    navigationTabs.push({ path: '/admin', label: 'Admin', icon: Settings });
  }

  const isActiveTab = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900">Padel League</h1>
            </div>
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = isActiveTab(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="flex items-center gap-2">
            {profile && (
              <>
                {/* Mobile: role badge + quick sign out */}
                <div className="md:hidden flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {profile.role === 'super_admin' ? 'Admin' :
                     profile.role === 'league_admin' ? 'League' : 
                     'Player'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="px-2"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Desktop: Full user info */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {profile.full_name}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {profile.role === 'super_admin' ? 'Super Admin' :
                       profile.role === 'league_admin' ? 'League Admin' : 
                       'Player'}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;