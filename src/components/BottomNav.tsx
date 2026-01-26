import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Trophy, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const BottomNav = () => {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/teams', label: 'Teams', icon: Users },
    { path: '/matches', label: 'Matches', icon: Calendar },
    { path: '/leagues', label: 'Leagues', icon: Trophy },
  ];

  if (profile?.role === 'super_admin') {
    navItems.push({ path: '/admin', label: 'Admin', icon: Settings });
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-2 px-1
                transition-colors duration-200
                ${active 
                  ? 'text-green-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-600 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

