import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  User,
  LogOut,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Header() {
  const { profile } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/teams', label: 'Teams', icon: Users },
    { path: '/matches', label: 'Matches', icon: Calendar },
    { path: '/leagues', label: 'Leagues', icon: Trophy },
    { path: '/standings', label: 'Standings', icon: TrendingUp },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Padel League</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={active ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            {profile.role === 'super_admin' && (
              <Badge variant="destructive" className="text-xs">
                Super Admin
              </Badge>
            )}
            {profile.role === 'league_admin' && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                League Admin
              </Badge>
            )}

            {/* Admin Panel Link */}
            {(profile.role === 'super_admin' || profile.role === 'league_admin') && (
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}

            {/* Profile Link */}
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4 mr-2" />
                {profile.full_name?.split(' ')[0] || 'Profile'}
              </Button>
            </Link>

            {/* Sign Out */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}