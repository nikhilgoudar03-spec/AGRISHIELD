import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Power, AlertOctagon, CheckCircle2, Clock, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { Device, PumpStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { useWebSocket } from '../../context/WebSocketContext';

export const PumpControlPage: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [pumpStatus, setPumpStatus] = useState<PumpStatus | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const devList = await api.getDevices();
      setDevices(devList);
      if (devList.length > 0) {
        const devId = selectedDeviceId || devList[0].id;
        if (!selectedDeviceId) setSelectedDeviceId(devId);

        const [pStatus, pHistory] = await Promise.all([
          api.getPumpStatus(devId).catch(() => null),
          api.getPumpHistory(devId).catch(() => [])
        ]);

        setPumpStatus(pStatus);
        setHistory(Array.isArray(pHistory) ? pHistory.slice(0, 10) : []);
      }
    } catch (err) {
      console.error('Failed to load pump data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);

    const unsubPump = subscribe('PUMP_STATE_UPDATED', (data) => {
      if (selectedDeviceId && data.device_id === selectedDeviceId) {
        setPumpStatus((prev) => prev ? { ...prev, current_state: data.actual_state } : null);
        setPendingCommand(null);
        loadData();
      }
    });

    return () => {
      clearInterval(interval);
      unsubPump();
    };
  }, [selectedDeviceId]);

  const handleSendCommand = async (cmd: 'ON' | 'OFF') => {
    if (!selectedDeviceId) return;
    setPendingCommand(cmd);
    setMessage(null);

    try {
      const res = await api.sendPumpCommand(selectedDeviceId, cmd);
      setMessage(res.message);
    } catch (err: any) {
      setMessage(`Command failed: ${err.message}`);
      setPendingCommand(null);
    }
  };

  const isPumpRunning = pumpStatus?.current_state === 'ON';
  const isLocked = pumpStatus?.emergency_lock;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('pump.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('pump.subtitle')}
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Pump Status Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('pump.currentState')}
              </span>
              <StatusBadge status={isPumpRunning ? 'LIVE' : pumpStatus?.current_state === 'OFFLINE' ? 'OFFLINE' : 'SAFE'} size="md" />
            </div>

            <div className="flex items-center gap-6 my-4">
              <div
                className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all ${
                  isPumpRunning
                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 animate-pulse'
                    : 'bg-slate-100 dark:bg-darkbg-surface text-slate-400 border border-slate-200 dark:border-darkbg-border'
                }`}
              >
                <Power className="w-12 h-12 stroke-[2.2]" />
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {isPumpRunning ? t('pump.on') : pumpStatus?.current_state === 'OFF' ? t('pump.off') : pumpStatus?.current_state || 'OFF'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {pumpStatus?.last_acknowledged_at
                    ? `Acknowledged by ESP32 at: ${new Date(pumpStatus.last_acknowledged_at).toLocaleTimeString()}`
                    : 'Awaiting initial device heartbeat'}
                </div>
              </div>
            </div>

            {pendingCommand && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>{t('pump.waitingAck')} (Target: {pendingCommand})</span>
              </div>
            )}

            {message && !pendingCommand && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-darkbg-surface text-xs font-medium text-slate-700 dark:text-slate-300">
                {message}
              </div>
            )}

            {isLocked && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 mt-4">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{t('pump.interlockWarning')}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => handleSendCommand('ON')}
              disabled={isLocked || isPumpRunning || pendingCommand !== null}
              className="flex-1 min-w-[140px] py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{t('pump.turnOn')}</span>
            </button>

            <button
              onClick={() => handleSendCommand('OFF')}
              disabled={!isPumpRunning && pendingCommand !== 'ON'}
              className="flex-1 min-w-[140px] py-4 rounded-2xl bg-slate-200 dark:bg-darkbg-surface hover:bg-slate-300 dark:hover:bg-darkbg-border text-slate-800 dark:text-slate-100 font-black text-sm transition-all"
            >
              {t('pump.turnOff')}
            </button>

            <button
              onClick={() => handleSendCommand('OFF')}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2"
            >
              <AlertOctagon className="w-5 h-5" />
              <span>{t('pump.emergencyStop')}</span>
            </button>
          </div>
        </div>

        {/* Hardware & Electrical Specifications Panel */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Hardware Safety Interlocks
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              AgriShield enforces hardware-level pump interlocks for zero accidental activations.
            </p>

            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Optically-isolated relay prevents electrical surges to ESP32</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Flyback diode suppression for inductive motor coils</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Automatic pump cutoff when heartbeat is lost for &gt; 30 seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Mandatory confirmation ACK before UI updates state</span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border text-[11px] text-slate-400">
            Control GPIO: <strong className="font-mono text-slate-700 dark:text-slate-300">GPIO 26 (Relay Trigger)</strong>
          </div>
        </div>
      </div>

      {/* Pump Activity History Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Verified Pump Command & Transition History
        </h3>

        {history.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-4">No pump records available in database yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-darkbg-border text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Command</th>
                  <th className="py-2.5 px-3">Reported State</th>
                  <th className="py-2.5 px-3">Trigger Source</th>
                  <th className="py-2.5 px-3">Requested At</th>
                  <th className="py-2.5 px-3">Hardware Acknowledged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/50">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-darkbg-surface/50">
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-white">{h.command}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.state === 'ON' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {h.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">{h.source}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{new Date(h.requested_at).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {h.acknowledged_at ? new Date(h.acknowledged_at).toLocaleTimeString() : 'PENDING_ACK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
