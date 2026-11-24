import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Moon, Sun, Globe, LogOut, Radio, User as UserIcon, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, role, logout } = useAuth();
  const { isConnected } = useWebSocket();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('agrishield_lang', lang);
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-white/95 dark:bg-darkbg-base/95 backdrop-blur-md border-slate-200 dark:border-darkbg-border px-4 lg:px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-darkbg-surface lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Shield className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                AGRI<span className="text-brand-600 dark:text-brand-400">SHIELD</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                IoT IoT-SAFETY
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block leading-none">
              Smart Farmer Protection Platform
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* PWA Connection Status Badge (Online / Offline / Sync Pending) */}
        <ConnectionStatusBadge />

        {/* Real-time status badge */}
        <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-card">
          <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            {isConnected ? 'Live WebSocket Connected' : 'Reconnecting...'}
          </span>
        </div>

        {/* Multilingual Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200">
          <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <select
            value={i18n.language}
            onChange={handleLanguageChange}
            className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="en" className="dark:bg-darkbg-card">English</option>
            <option value="kn" className="dark:bg-darkbg-card">ಕನ್ನಡ (Kannada)</option>
            <option value="hi" className="dark:bg-darkbg-card">हिन्दी (Hindi)</option>
          </select>
        </div>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-card hover:bg-slate-100 dark:hover:bg-darkbg-surface text-slate-700 dark:text-slate-200 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-darkbg-border">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {user.farmer_profile?.full_name || user.email.split('@')[0]}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-brand-600 dark:text-brand-400">
                {role === 'ADMIN' ? t('roles.admin') : t('roles.farmer')}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
