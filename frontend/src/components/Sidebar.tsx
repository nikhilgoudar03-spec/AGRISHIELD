import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, Users, Cpu, Activity, Camera, 
  ShieldAlert, Navigation, Power, Bell, FileText, Settings, User as UserIcon, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { role } = useAuth();

  const adminNav = [
    { to: '/admin', label: t('nav.overview'), icon: LayoutDashboard },
    { to: '/admin/farmers', label: t('nav.farmers'), icon: Users },
    { to: '/admin/devices', label: t('nav.devices'), icon: Cpu },
    { to: '/admin/sensors', label: t('nav.liveSensors'), icon: Activity },
    { to: '/admin/camera', label: t('nav.camera'), icon: Camera },
    { to: '/admin/fall-detection', label: t('nav.fallDetection'), icon: ShieldAlert },
    { to: '/admin/gps', label: t('nav.gpsTracking'), icon: Navigation },
    { to: '/admin/pump', label: t('nav.pumpControl'), icon: Power },
    { to: '/admin/alerts', label: t('nav.emergencyAlerts'), icon: Bell },
    { to: '/admin/reports', label: t('nav.history'), icon: FileText },
    { to: '/admin/settings', label: t('nav.settings'), icon: Settings },
  ];

  const farmerNav = [
    { to: '/farmer', label: t('nav.overview'), icon: LayoutDashboard },
    { to: '/farmer/sensors', label: t('nav.liveSensors'), icon: Activity },
    { to: '/farmer/camera', label: t('nav.camera'), icon: Camera },
    { to: '/farmer/safety', label: t('nav.fallDetection'), icon: ShieldAlert },
    { to: '/farmer/pump', label: t('nav.pumpControl'), icon: Power },
    { to: '/farmer/gps', label: t('nav.gpsTracking'), icon: Navigation },
    { to: '/farmer/alerts', label: t('nav.emergencyAlerts'), icon: Bell },
    { to: '/farmer/history', label: t('nav.history'), icon: FileText },
    { to: '/farmer/profile', label: t('nav.profile'), icon: UserIcon },
    { to: '/farmer/settings', label: t('nav.settings'), icon: Settings },
  ];

  const links = role === 'ADMIN' ? adminNav : farmerNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity" 
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg-card transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-darkbg-border lg:hidden">
          <span className="font-bold text-slate-800 dark:text-white">AgriShield Menu</span>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-darkbg-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 dark:border-darkbg-border/60">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {role === 'ADMIN' ? 'ADMINISTRATION SUITE' : 'FARMER WORKSPACE'}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/farmer'}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/80 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-darkbg-surface hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-darkbg-border text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span>Hardware Firmware</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">v1.2-STABLE</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">Strict Live Verification</div>
        </div>
      </aside>
    </>
  );
};
