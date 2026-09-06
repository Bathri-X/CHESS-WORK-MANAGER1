import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div
        id="reconnected-banner"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white shadow-xl shadow-emerald-950/40 animate-in fade-in slide-in-from-bottom-2"
      >
        <Wifi className="w-4 h-4" />
        <span>Connected back online. Data synced!</span>
      </div>
    );
  }

  return (
    <div
      id="offline-banner"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/90 backdrop-blur-sm px-3.5 py-2 text-xs font-medium text-white shadow-xl shadow-amber-950/40 animate-in fade-in"
    >
      <WifiOff className="w-4 h-4" />
      <span>Offline Mode — Changes saved locally to device</span>
    </div>
  );
};
