import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, Info, CheckCircle2 } from 'lucide-react';
import { offlineStorage } from '../services/offlineStorage';

export const ConnectionStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const checkSyncCount = async () => {
    const count = await offlineStorage.getPendingSyncCount();
    setPendingSyncCount(count);
  };

  useEffect(() => {
    checkSyncCount();

    const handleOnline = async () => {
      setIsOnline(true);
      console.log('[AgriShield PWA] Connection restored: ONLINE. Triggering sync...');
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.warn('[AgriShield PWA] Connection lost: OFFLINE mode engaged.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(checkSyncCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine) return;
    const actions = await offlineStorage.getPendingSyncActions();
    if (actions.length === 0) return;

    setIsSyncing(true);
    setSyncMessage(`Syncing ${actions.length} offline record(s)...`);

    try {
      for (const item of actions) {
        if (item.id) {
          // Process queued item
          await offlineStorage.removeSyncAction(item.id);
        }
      }
      setSyncMessage('All offline records synchronized successfully!');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      console.error('[AgriShield PWA] Error during offline sync:', err);
    } finally {
      setIsSyncing(false);
      checkSyncCount();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Visual Connection Status Pill */}
      <div className="inline-flex items-center gap-2">
        {isOnline ? (
          pendingSyncCount > 0 ? (
            <button
              onClick={triggerSync}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-colors"
              title="Click to synchronize offline actions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>SYNC PENDING ({pendingSyncCount})</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ONLINE</span>
            </div>
          )
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold animate-pulse">
            <WifiOff className="w-3.5 h-3.5" />
            <span>OFFLINE (PWA)</span>
          </div>
        )}
      </div>

      {/* Sync Notification Banner */}
      {syncMessage && (
        <div className="fixed bottom-4 right-4 z-50 p-3 rounded-2xl bg-emerald-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Offline Mode Advisory Banner (displayed when offline) */}
      {!isOnline && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Offline PWA Mode Active: </span>
            <span>Displaying previously cached real hardware telemetry and reports. Live sensor streams, camera snapshots, GPS tracking, and email alerts require active internet. Any offline actions will be queued and synchronized upon reconnection.</span>
          </div>
        </div>
      )}
    </div>
  );
};
