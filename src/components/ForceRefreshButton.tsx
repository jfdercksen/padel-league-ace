import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface ForceRefreshButtonProps {
  onRefresh: () => void;
  className?: string;
}

const ForceRefreshButton = ({ onRefresh, className = '' }: ForceRefreshButtonProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      await onRefresh();
      // Show success state briefly
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Refresh failed:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      variant="outline"
      size="sm"
      disabled={isRefreshing}
      className={`${className} ${isRefreshing ? 'bg-green-50 text-green-700 border-green-300' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'}`}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Standings'}
    </Button>
  );
};

export default ForceRefreshButton;