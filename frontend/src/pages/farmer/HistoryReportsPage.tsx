import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Activity, Power, Bell, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { Device } from '../../types';

export const HistoryReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  useEffect(() => {
    api.getDevices().then((list) => {
      setDevices(list);
      if (list.length > 0) setSelectedDeviceId(list[0].id);
    });
  }, []);

  const downloadReport = (type: 'sensors' | 'pump' | 'emergency', format: 'csv' | 'pdf') => {
    let url = '';
    if (type === 'sensors' && selectedDeviceId) {
      url = api.getSensorReportUrl(selectedDeviceId, format);
    } else if (type === 'pump' && selectedDeviceId) {
      url = api.getPumpReportUrl(selectedDeviceId, format);
    } else if (type === 'emergency') {
      url = api.getEmergencyReportUrl(format);
    }
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('reports.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('reports.subtitle')}
          </p>
        </div>

        {devices.length > 1 && (
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.device_uid})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sensor Telemetry Report */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('reports.sensorLog')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Complete historical stream of MQ-135, DHT11 and MPU-6050 readings with timestamps and validity flags.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => downloadReport('sensors', 'csv')}
              disabled={!selectedDeviceId}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border hover:bg-slate-100 dark:hover:bg-darkbg-surface text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{t('reports.exportCsv')}</span>
            </button>
            <button
              onClick={() => downloadReport('sensors', 'pdf')}
              disabled={!selectedDeviceId}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>{t('reports.exportPdf')}</span>
            </button>
          </div>
        </div>

        {/* Pump Activity Report */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Power className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('reports.pumpLog')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Full log of all relay actuations, manual triggers, hardware confirmations, and emergency cutoffs.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => downloadReport('pump', 'csv')}
              disabled={!selectedDeviceId}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border hover:bg-slate-100 dark:hover:bg-darkbg-surface text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>

        {/* Emergency Incidents Report */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('reports.alertLog')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Official audit log of fall incidents, air quality alarms, notification deliveries, and resolution timestamps.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => downloadReport('emergency', 'csv')}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border hover:bg-slate-100 dark:hover:bg-darkbg-surface text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
