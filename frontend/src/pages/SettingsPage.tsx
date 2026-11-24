import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Globe, Moon, Sun, Sliders, Bell, Check, Save } from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { UserSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [settings, setSettingsState] = useState<UserSettings>({
    language: 'en',
    theme: 'dark',
    fall_cancellation_timeout_sec: 20,
    mq135_warning_ppm: 350.0,
    mq135_critical_ppm: 600.0,
    email_notifications_enabled: true,
    sms_notifications_enabled: true,
  });

  const [savedMsg, setSavedMsg] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettingsState(s);
    }).catch(() => {});
  }, []);

  const handleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('agrishield_lang', lang);
    setSettingsState((prev) => ({ ...prev, language: lang }));
  };

  const handleTheme = (thm: 'dark' | 'light') => {
    setTheme(thm);
    setSettingsState((prev) => ({ ...prev, theme: thm }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(false);

    try {
      await api.updateSettings(settings);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Personalize system interface, safety thresholds, and notification preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Appearance & Language */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-darkbg-border">
            <Globe className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Language & Interface Theme</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {t('settings.language')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'kn', label: 'ಕನ್ನಡ' },
                  { code: 'hi', label: 'हिन्दी' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleLanguage(item.code)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      i18n.language === item.code
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                        : 'bg-slate-50 dark:bg-darkbg-surface text-slate-700 dark:text-slate-300 border-slate-200 dark:border-darkbg-border hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {t('settings.theme')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTheme('dark')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    theme === 'dark'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                      : 'bg-slate-50 dark:bg-darkbg-surface text-slate-700 dark:text-slate-300 border-slate-200 dark:border-darkbg-border'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark Charcoal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTheme('light')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    theme === 'light'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                      : 'bg-slate-50 dark:bg-darkbg-surface text-slate-700 dark:text-slate-300 border-slate-200 dark:border-darkbg-border'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Clean Light</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Interlock Thresholds */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-darkbg-border">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Safety Interlocks & Thresholds</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>{t('settings.fallTimeout')}</span>
                <span className="font-mono text-brand-600">{settings.fall_cancellation_timeout_sec}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={settings.fall_cancellation_timeout_sec}
                onChange={(e) => setSettingsState({ ...settings, fall_cancellation_timeout_sec: Number(e.target.value) })}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Grace period before emergency buzzer and SMS alert escalation.
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('settings.mq135Warning')}
                </label>
                <input
                  type="number"
                  value={settings.mq135_warning_ppm}
                  onChange={(e) => setSettingsState({ ...settings, mq135_warning_ppm: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('settings.mq135Critical')}
                </label>
                <input
                  type="number"
                  value={settings.mq135_critical_ppm}
                  onChange={(e) => setSettingsState({ ...settings, mq135_critical_ppm: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Dispatch */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-darkbg-border">
            <Bell className="w-5 h-5 text-sky-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Emergency Dispatch Channels</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border cursor-pointer">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                SMS Alerts to Emergency Kin Contact
              </span>
              <input
                type="checkbox"
                checked={settings.sms_notifications_enabled}
                onChange={(e) => setSettingsState({ ...settings, sms_notifications_enabled: e.target.checked })}
                className="w-4 h-4 accent-brand-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border cursor-pointer">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Email Broadcast on Critical Gas Alarms
              </span>
              <input
                type="checkbox"
                checked={settings.email_notifications_enabled}
                onChange={(e) => setSettingsState({ ...settings, email_notifications_enabled: e.target.checked })}
                className="w-4 h-4 accent-brand-600 rounded"
              />
            </label>
          </div>
        </div>

        {savedMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : t('settings.save')}</span>
        </button>
      </form>
    </div>
  );
};
