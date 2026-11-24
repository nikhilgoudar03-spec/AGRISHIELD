import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Cpu, Wifi, WifiOff, AlertOctagon, RefreshCw, Shield, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Device, EmergencyAlert } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { useWebSocket } from '../../context/WebSocketContext';

export const AdminOverview: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [devices, setDevices] = useState<Device[]>([]);
  const [farmersCount, setFarmersCount] = useState(0);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const [devList, farmerList, alertList] = await Promise.all([
        api.getDevices().catch(() => []),
        api.getFarmers().catch(() => []),
        api.getEmergencyAlerts().catch(() => [])
      ]);
      setDevices(devList);
      setFarmersCount(farmerList.length);
      setAlerts(alertList);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(loadAdminData, 8000);

    const unsubHeartbeat = subscribe('DEVICE_HEARTBEAT', () => loadAdminData());
    const unsubAlert = subscribe('EMERGENCY_TRIGGERED', () => loadAdminData());

    return () => {
      clearInterval(interval);
      unsubHeartbeat();
      unsubAlert();
    };
  }, []);

  const connectedCount = devices.filter((d) => d.status === 'ONLINE').length;
  const disconnectedCount = devices.filter((d) => d.status !== 'ONLINE').length;
  const unresolvedAlerts = alerts.filter((a) => a.status !== 'RESOLVED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
              OPERATIONAL COMMAND
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            AgriShield Central Administration
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time telemetry, authorized hardware inventory, and emergency response center
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Synchronize Hardware</span>
        </button>
      </div>

      {/* KPI Stats Cards (Actual Database Information Only) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Registered Farmers</span>
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {farmersCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Verified safety profiles</span>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Connected Devices</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Wifi className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {connectedCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active valid heartbeats</span>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Disconnected Devices</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-darkbg-surface text-slate-500">
              <WifiOff className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-700 dark:text-slate-300">
            {disconnectedCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Heartbeat timed out</span>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Unresolved Emergencies</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
            {unresolvedAlerts.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Requires staff resolution</span>
        </div>
      </div>

      {/* Hardware Fleet Inventory Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Registered Field Hardware Fleet
          </h3>
          <Link
            to="/admin/devices"
            className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
          >
            <span>Manage Hardware</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {devices.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-6 text-center">
            No hardware units registered yet. Click "Manage Hardware" to register ESP32 DevKit V1 or ESP32-CAM.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-darkbg-border text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Device UID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Assigned Farmer</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Firmware</th>
                  <th className="py-2.5 px-3">Latest Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/50">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-darkbg-surface/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{d.device_uid}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{d.device_type}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {d.assigned_farmer_name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{d.firmware_version || 'v1.2'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleTimeString() : 'Never'}
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
