import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  Trophy, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Home
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Header = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
  };

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
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ tab, mobile = false }: { tab: any; mobile?: boolean }) => {
    const Icon = tab.icon;
    const isActive = isActiveTab(tab.path);
    
    return (
      <Link
        to={tab.path}
        onClick={() => mobile && setMobileMenuOpen(false)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${mobile ? 'w-full justify-start' : 'justify-center'}
          ${isActive 
            ? 'text-green-600 bg-green-50 border-green-200' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <Icon className="w-4 h-4" />
        <span className={mobile ? '' : 'hidden sm:inline'}>{tab.label}</span>
      </Link>
    );
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">Padel League</h1>
              <p className="text-xs text-gray-500">Tournament Manager</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationTabs.map((tab) => (
              <NavLink key={tab.path} tab={tab} />
            ))}
          </nav>

          {/* User Info & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            {/* User Info */}
            {profile && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {profile.full_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {profile.role === 'super_admin' ? 'Super Admin' :
                       profile.role === 'league_admin' ? 'League Admin' : 
                       'Player'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="hidden lg:flex"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            {/* Mobile Navigation Links */}
            {navigationTabs.map((tab) => (
              <NavLink key={tab.path} tab={tab} mobile />
            ))}
            
            {/* Mobile User Info */}
            {profile && (
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="px-3">
                  <p className="text-sm font-medium text-gray-900">
                    {profile.full_name}
                  </p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {profile.role === 'super_admin' ? 'Super Admin' :
                     profile.role === 'league_admin' ? 'League Admin' : 
                     'Player'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;