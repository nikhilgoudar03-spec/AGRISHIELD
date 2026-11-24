import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ShieldAlert, CheckCircle, RefreshCw, AlertOctagon, MapPin, ExternalLink, Image } from 'lucide-react';
import { api } from '../../services/api';
import { EmergencyAlert } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { useWebSocket } from '../../context/WebSocketContext';

export const EmergencyAlertsPage: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const data = await api.getEmergencyAlerts(filter || undefined);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load emergency alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 8000);

    const unsubAlert = subscribe('EMERGENCY_TRIGGERED', () => loadAlerts());
    const unsubStatus = subscribe('ALERT_STATUS_CHANGED', () => loadAlerts());

    return () => {
      clearInterval(interval);
      unsubAlert();
      unsubStatus();
    };
  }, [filter]);

  const handleUpdateStatus = async (alertId: number, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await api.updateAlertStatus(alertId, newStatus);
      loadAlerts();
    } catch (err) {
      console.error('Failed to update alert status:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('alerts.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('alerts.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <button
            onClick={loadAlerts}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-emerald-500/80 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t('alerts.noAlerts')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All system parameters and hardware interlocks operating normally.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-6 rounded-3xl border transition-all ${
                alert.status === 'NEW'
                  ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/40 shadow-sm'
                  : 'bg-white dark:bg-darkbg-card border-slate-200 dark:border-darkbg-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 mb-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-darkbg-surface text-slate-800 dark:text-slate-200">
                      {alert.event_uid}
                    </span>
                    <StatusBadge status={alert.severity} size="sm" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {alert.alert_type}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      • {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>Device: <strong className="font-mono text-slate-700 dark:text-slate-300">{alert.device_uid}</strong></span>
                    {alert.latitude && alert.longitude && (
                      <span className="flex items-center gap-1 text-sky-600 font-mono">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start">
                  {alert.status === 'NEW' && (
                    <button
                      onClick={() => handleUpdateStatus(alert.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/20"
                    >
                      {t('alerts.acknowledge')}
                    </button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
                    >
                      {t('alerts.resolve')}
                    </button>
                  )}
                  {alert.status === 'RESOLVED' && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Resolved</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
