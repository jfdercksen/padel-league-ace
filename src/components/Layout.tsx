import { useAuth } from '@/hooks/useAuth';
import Header from './Header';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();

  // Don't show layout (header/nav) when not logged in
  if (!profile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-4 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

