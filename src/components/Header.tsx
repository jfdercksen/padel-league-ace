import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const navigationTabs = [
    { path: '/', label: 'Dashboard' },
    { path: '/leagues', label: 'Leagues' },
    { path: '/teams', label: 'Teams' },
    { path: '/matches', label: 'Matches' },
    { path: '/calendar', label: 'Calendar' },
  ];

  const isActiveTab = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  if (!user || !profile) return null;

  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Top Header Bar */}
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              PadelPro
            </h1>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {profile.role === 'super_admin' ? 'Super Admin' : 
               profile.role === 'league_admin' ? 'League Admin' : 'Player'}
            </Badge>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            
            {/* User Info */}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">{profile.full_name}</span>
            </div>
            
            {/* Sign Out */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-300"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-0 border-b-0">
          {navigationTabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                isActiveTab(tab.path)
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;