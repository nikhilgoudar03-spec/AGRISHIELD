import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, Cpu, Phone, MapPin, AlertTriangle, Check, Plus, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { Device } from '../../types';

export const FarmerManagement: React.FC = () => {
  const { t } = useTranslation();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<any | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [fList, dList] = await Promise.all([
        api.getFarmers(searchTerm),
        api.getDevices()
      ]);
      setFarmers(fList);
      setDevices(dList);
    } catch (err) {
      console.error('Failed to load farmers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const handleAssign = async () => {
    if (!selectedFarmer || !selectedDeviceId) return;
    try {
      await api.assignDeviceToFarmer(selectedFarmer.id, selectedDeviceId);
      setMsg(`Device successfully assigned to ${selectedFarmer.full_name}`);
      setAssignModal(false);
      loadData();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Farmer Accounts & Safety Management
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Search profiles, assign telemetry hardware, and monitor village safety status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, village, district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-xs text-slate-900 dark:text-white w-64 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {farmers.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border text-center">
          <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Farmers Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Farmers register their own profile through the public registration portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farmers.map((farmer) => (
            <div
              key={farmer.id}
              className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {farmer.full_name}
                    </h3>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{farmer.village}, {farmer.district}</span>
                    </span>
                  </div>
                  {farmer.unresolved_alerts > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{farmer.unresolved_alerts} Alert(s)</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 dark:border-darkbg-border/60 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mobile:</span>
                    <span className="font-mono font-semibold">{farmer.mobile_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Kin Emergency Contact:</span>
                    <span className="font-medium">{farmer.emergency_contact_name} ({farmer.emergency_contact_mobile})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Linked Devices:</span>
                    <span className="font-bold text-brand-600">{farmer.devices_count} Unit(s)</span>
                  </div>
                </div>

                {farmer.devices.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {farmer.devices.map((d: any) => (
                      <span
                        key={d.id}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-darkbg-surface text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300"
                      >
                        {d.device_uid} ({d.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedFarmer(farmer);
                  setAssignModal(true);
                }}
                className="mt-5 w-full py-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface hover:bg-slate-100 dark:hover:bg-darkbg-border text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4 text-brand-600" />
                <span>Assign Hardware Unit</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Assign Device Modal */}
      {assignModal && selectedFarmer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Assign Device to {selectedFarmer.full_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select an authorized hardware unit from your inventory to link to this farmer's account.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Available Hardware Devices
                </label>
                <select
                  value={selectedDeviceId || ''}
                  onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-900 dark:text-white text-xs outline-none"
                >
                  <option value="">-- Choose Hardware Unit --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.device_uid} - {d.name} ({d.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-darkbg-surface text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={!selectedDeviceId}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-bold shadow-md"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
