import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, AlertTriangle, AlertOctagon, Activity, Thermometer, 
  Droplets, Power, Navigation, Camera, WifiOff, RefreshCw 
} from 'lucide-react';
import { api } from '../../services/api';
import { Device, LatestTelemetry, PumpStatus, GPSData, EmergencyAlert } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { SensorCard } from '../../components/SensorCard';
import { FallAlertBanner } from '../../components/FallAlertBanner';
import { useWebSocket } from '../../context/WebSocketContext';

export const FarmerOverview: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<LatestTelemetry | null>(null);
  const [pump, setPump] = useState<PumpStatus | null>(null);
  const [gps, setGps] = useState<GPSData | null>(null);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const devList = await api.getDevices();
      setDevices(devList);
      if (devList.length > 0) {
        const current = selectedDevice || devList[0];
        setSelectedDevice(current);
        const [telData, pumpData, gpsData, alertData] = await Promise.all([
          api.getLatestTelemetry(current.id).catch(() => null),
          api.getPumpStatus(current.id).catch(() => null),
          api.getLatestGPS(current.id).catch(() => null),
          api.getEmergencyAlerts().catch(() => [])
        ]);
        setTelemetry(telData);
        setPump(pumpData);
        setGps(gpsData);
        setAlerts(alertData.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load farmer overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);

    const unsubTelemetry = subscribe('TELEMETRY_UPDATE', (data) => {
      if (selectedDevice && data.device_id === selectedDevice.id) {
        loadData();
      }
    });

    const unsubPump = subscribe('PUMP_STATE_UPDATED', (data) => {
      if (selectedDevice && data.device_id === selectedDevice.id) {
        setPump((prev) => prev ? { ...prev, current_state: data.actual_state } : null);
      }
    });

    return () => {
      clearInterval(interval);
      unsubTelemetry();
      unsubPump();
    };
  }, [selectedDevice?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500 font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Connecting to AgriShield Field Sensors...</span>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border text-center max-w-lg mx-auto mt-12">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <WifiOff className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Assigned Hardware Device</h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Your farmer profile is registered, but no ESP32 telemetry hardware is currently linked to your account. Please ask your AgriShield administrator to assign device UID (e.g. ESP32_AGRI_01).
        </p>
      </div>
    );
  }

  const overallSafety = telemetry?.overall_safety_status || (selectedDevice?.status === 'OFFLINE' ? 'DEVICE OFFLINE' : 'NO DATA');

  return (
    <div className="space-y-6">
      {/* Device Header & Safety Master Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Farmer Safety Dashboard
            </h1>
            <StatusBadge status={overallSafety} size="lg" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>Device: <strong className="text-slate-700 dark:text-slate-200 font-mono">{selectedDevice?.device_uid}</strong></span>
            <span>•</span>
            <span>Firmware: <span className="font-mono">{selectedDevice?.firmware_version || 'v1.2'}</span></span>
            <span>•</span>
            <span>Last Heartbeat: <span className="font-mono">{selectedDevice?.last_heartbeat ? new Date(selectedDevice.last_heartbeat).toLocaleTimeString() : 'Never'}</span></span>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Hardware</span>
        </button>
      </div>

      {/* Fall Alert Banner if possible fall detected */}
      {selectedDevice && <FallAlertBanner deviceId={selectedDevice.id} />}

      {/* Real-Time Sensor Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <SensorCard
          title={t('sensors.mq135Title')}
          icon={Activity}
          reading={telemetry?.mq135}
          rawAdcLabel="Raw Gas ADC"
          notes={t('sensors.note')}
          colorScheme="amber"
        />

        <SensorCard
          title={t('sensors.tempTitle')}
          icon={Thermometer}
          reading={telemetry?.dht11_temp}
          notes="Real ambient reading in Celsius"
          colorScheme="blue"
        />

        <SensorCard
          title={t('sensors.humTitle')}
          icon={Droplets}
          reading={telemetry?.dht11_hum}
          notes="Relative humidity percentage"
          colorScheme="green"
        />

        <SensorCard
          title={t('sensors.motionTitle')}
          icon={AlertTriangle}
          reading={telemetry?.mpu6050_acc}
          notes={`Movement state: ${telemetry?.movement_status || 'NO DATA'}`}
          colorScheme="purple"
        />
      </div>

      {/* Pump Safety & GPS Satellite Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pump Status Widget */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('pump.title')}</h3>
                  <span className="text-[11px] text-slate-500">{t('pump.subtitle')}</span>
                </div>
              </div>
              <StatusBadge status={pump?.current_state === 'ON' ? 'LIVE' : pump?.current_state === 'OFFLINE' ? 'OFFLINE' : 'SAFE'} size="sm" />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('pump.currentState')}</span>
                <div className="text-xl font-black mt-0.5 text-slate-900 dark:text-white">
                  {pump?.current_state === 'ON' ? t('pump.on') : pump?.current_state === 'OFF' ? t('pump.off') : pump?.current_state || 'OFF'}
                </div>
              </div>
              {pump?.emergency_lock && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 text-xs font-bold border border-rose-500/30">
                  Safety Lock Engaged
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
              {t('pump.directGpioWarning')}
            </p>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => selectedDevice && api.sendPumpCommand(selectedDevice.id, 'ON').then(loadData)}
              disabled={pump?.emergency_lock || selectedDevice?.status === 'OFFLINE'}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
            >
              {t('pump.turnOn')}
            </button>
            <button
              onClick={() => selectedDevice && api.sendPumpCommand(selectedDevice.id, 'OFF').then(loadData)}
              disabled={selectedDevice?.status === 'OFFLINE'}
              className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-darkbg-surface hover:bg-slate-300 dark:hover:bg-darkbg-border text-slate-800 dark:text-slate-200 font-bold text-xs transition-all"
            >
              {t('pump.turnOff')}
            </button>
          </div>
        </div>

        {/* GPS Satellite Widget */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('gps.title')}</h3>
                  <span className="text-[11px] text-slate-500">{t('gps.subtitle')}</span>
                </div>
              </div>
              <StatusBadge status={gps?.status === 'VALID_FIX' ? 'LIVE' : 'NO_DATA'} size="sm" />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
              {gps?.status === 'VALID_FIX' ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">{t('gps.lat')}:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{gps.latitude?.toFixed(6)}°</div>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('gps.lng')}:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{gps.longitude?.toFixed(6)}°</div>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('gps.satellites')}:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{gps.satellites} Sats</div>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('gps.speed')}:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{gps.speed || 0} km/h</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic py-2">
                  {t('gps.noFix')}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-darkbg-border/60 text-[11px] text-slate-500 flex justify-between">
            <span>NEO-6M Status:</span>
            <span className="font-mono font-bold">{gps?.status === 'VALID_FIX' ? '3D Fix Acquired' : 'Searching for Satellites...'}</span>
          </div>
        </div>
      </div>

      {/* Recent Alerts List */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Recent Safety Incident Logs
        </h3>

        {alerts.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 italic py-3">
            {t('alerts.noAlerts')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-darkbg-border text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">UID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/50">
                {alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-darkbg-surface/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{a.event_uid}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{a.alert_type}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={a.severity} size="sm" /></td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{a.message}</td>
                    <td className="py-2.5 px-3 font-semibold">{a.status}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
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
