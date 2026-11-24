import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation, Satellite, Compass, MapPin, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { Device, GPSData } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { useWebSocket } from '../../context/WebSocketContext';

export const GPSTrackingPage: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const devList = await api.getDevices();
      setDevices(devList);
      if (devList.length > 0) {
        const devId = selectedDeviceId || devList[0].id;
        if (!selectedDeviceId) setSelectedDeviceId(devId);

        const gps = await api.getLatestGPS(devId).catch(() => null);
        setGpsData(gps);
      }
    } catch (err) {
      console.error('Failed to load GPS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);

    const unsub = subscribe('GPS_LOCATION_UPDATED', (data) => {
      if (selectedDeviceId && data.device_id === selectedDeviceId) {
        loadData();
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [selectedDeviceId]);

  const hasFix = gpsData?.status === 'VALID_FIX' && gpsData.latitude && gpsData.longitude;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('gps.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('gps.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={hasFix ? 'LIVE' : 'NO_DATA'} size="md" />
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>{t('gps.lat')}</span>
          </div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {hasFix ? `${gpsData.latitude?.toFixed(6)}°` : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">WGS84 Coordinates</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            <span>{t('gps.lng')}</span>
          </div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {hasFix ? `${gpsData.longitude?.toFixed(6)}°` : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">WGS84 Coordinates</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
            <Satellite className="w-4 h-4 text-amber-500" />
            <span>{t('gps.satellites')}</span>
          </div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {gpsData?.satellites ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">In Active Constellation</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
            <Compass className="w-4 h-4 text-purple-500" />
            <span>{t('gps.speed')}</span>
          </div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {gpsData?.speed !== null && gpsData?.speed !== undefined ? `${gpsData.speed.toFixed(1)} km/h` : '0.0 km/h'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Ground Velocity</span>
        </div>
      </div>

      {/* Map Viewport or Empty State */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-brand-600" />
            <span>Field Geographic Positioning</span>
          </h3>
          {hasFix && (
            <a
              href={`https://www.google.com/maps?q=${gpsData.latitude},${gpsData.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>Open in Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {hasFix ? (
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-darkbg-border relative bg-slate-900">
            <iframe
              title="Field GPS Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(gpsData.longitude || 0) - 0.005}%2C${(gpsData.latitude || 0) - 0.005}%2C${(gpsData.longitude || 0) + 0.005}%2C${(gpsData.latitude || 0) + 0.005}&layer=mapnik&marker=${gpsData.latitude}%2C${gpsData.longitude}`}
            />
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-slate-200 dark:border-darkbg-border rounded-2xl">
            <Satellite className="w-12 h-12 mx-auto text-slate-400 animate-pulse mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t('gps.noFix')}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              NEO-6M GPS antenna requires unobstructed line-of-sight to orbiting GPS satellites. As soon as a 3D satellite fix is acquired by hardware, exact field coordinates and interactive map will display here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
