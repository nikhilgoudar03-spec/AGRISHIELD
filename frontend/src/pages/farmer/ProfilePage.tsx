import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, Phone, MapPin, Shield, Cpu, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Device } from '../../types';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    api.getDevices().then(setDevices);
  }, []);

  const profile = user?.farmer_profile;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Farmer Safety Profile
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Your personal details and assigned emergency dispatch contact information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-darkbg-border">
            <UserIcon className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Full Name</span>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.full_name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Mobile Phone</span>
              <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">{profile?.mobile_number || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Village / Hobli</span>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.village || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">District</span>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.district || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Account Email</span>
              <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Emergency Contact & Hardware Pairing */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-darkbg-border">
              <HeartHandshake className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Emergency Dispatch Contact</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Emergency Contact Name</span>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.emergency_contact_name || 'N/A'}</div>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Emergency Mobile Number</span>
                <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">{profile?.emergency_contact_mobile || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-darkbg-border">
              <Cpu className="w-5 h-5 text-purple-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Linked Hardware Unit</h3>
            </div>

            {devices.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No device linked yet.</div>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-darkbg-surface flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{d.device_uid}</span>
                    <div className="text-[11px] text-slate-400">{d.name}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    d.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
