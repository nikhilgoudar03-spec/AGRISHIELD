import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Plus, Key, RefreshCw, Check, Copy, Wifi, WifiOff } from 'lucide-react';
import { api } from '../../services/api';
import { Device } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

export const DeviceManagement: React.FC = () => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_uid: '',
    name: '',
    device_type: 'TELEMETRY_CONTROLLER',
    api_key: 'agrishield_' + Math.random().toString(36).substring(2, 10),
  });
  const [createdInfo, setCreatedInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDevices = async () => {
    try {
      const list = await api.getDevices();
      setDevices(list);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.registerDevice(newDevice);
      setCreatedInfo({
        device_uid: res.device_uid,
        api_key: newDevice.api_key,
      });
      setShowAddModal(false);
      loadDevices();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Authorized Hardware Fleet
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Register ESP32 DevKit V1 and ESP32-CAM microcontrollers with SHA-256 token authorization
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register Hardware Unit</span>
          </button>

          <button
            onClick={loadDevices}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {createdInfo && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>New Device Registered! Flash credentials into ESP32 firmware:</span>
            </h4>
            <button
              onClick={() => setCreatedInfo(null)}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Dismiss
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-black/80 font-mono text-xs text-emerald-400 space-y-1 select-all">
            <div>#define DEVICE_UID "{createdInfo.device_uid}"</div>
            <div>#define DEVICE_KEY "{createdInfo.api_key}"</div>
            <div>#define API_HOST   "http://your-server-ip:8000"</div>
          </div>
        </div>
      )}

      {/* Hardware Fleet Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Device Inventory & Real-Time Connection Matrix
        </h3>

        {devices.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-6 text-center">
            No hardware registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-darkbg-border text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Device UID</th>
                  <th className="py-2.5 px-3">Unit Name</th>
                  <th className="py-2.5 px-3">Controller Type</th>
                  <th className="py-2.5 px-3">Assigned Farmer</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Firmware</th>
                  <th className="py-2.5 px-3">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/50">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-darkbg-surface/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {d.device_uid}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {d.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {d.device_type}
                    </td>
                    <td className="py-2.5 px-3">
                      {d.assigned_farmer_name ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{d.assigned_farmer_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {d.firmware_version || 'v1.2'}
                    </td>
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

      {/* Register Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Register New Hardware Unit
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Authorize a new ESP32 microcontroller to transmit telemetry to AgriShield.
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Device UID (MAC / Serial) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ESP32_AGRI_02"
                  value={newDevice.device_uid}
                  onChange={(e) => setNewDevice({ ...newDevice, device_uid: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-900 dark:text-white text-xs outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Device Descriptive Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ESP32 DevKit V1 - Field Unit 2"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hardware Type
                </label>
                <select
                  value={newDevice.device_type}
                  onChange={(e) => setNewDevice({ ...newDevice, device_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-900 dark:text-white text-xs outline-none"
                >
                  <option value="TELEMETRY_CONTROLLER">TELEMETRY_CONTROLLER (ESP32 DevKit V1)</option>
                  <option value="CAMERA_MODULE">CAMERA_MODULE (ESP32-CAM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Generated Hardware Secret Key *
                </label>
                <input
                  type="text"
                  required
                  value={newDevice.api_key}
                  onChange={(e) => setNewDevice({ ...newDevice, api_key: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-900 dark:text-white text-xs outline-none font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-darkbg-surface text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
