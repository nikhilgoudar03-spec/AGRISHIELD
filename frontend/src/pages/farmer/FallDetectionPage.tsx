import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Compass, Activity, CheckCircle, AlertOctagon, RefreshCw, Volume2, Power } from 'lucide-react';
import { api } from '../../services/api';
import { Device, LatestTelemetry, FallEvent } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { FallAlertBanner } from '../../components/FallAlertBanner';
import { useWebSocket } from '../../context/WebSocketContext';

export const FallDetectionPage: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState<LatestTelemetry | null>(null);
  const [activeFall, setActiveFall] = useState<FallEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const devList = await api.getDevices();
      setDevices(devList);
      if (devList.length > 0) {
        const devId = selectedDeviceId || devList[0].id;
        if (!selectedDeviceId) setSelectedDeviceId(devId);

        const [telData, fallData] = await Promise.all([
          api.getLatestTelemetry(devId).catch(() => null),
          api.getActiveFall(devId).catch(() => null)
        ]);

        setTelemetry(telData);
        setActiveFall(fallData);
      }
    } catch (err) {
      console.error('Failed to load fall telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);

    const unsub = subscribe('TELEMETRY_UPDATE', (data) => {
      if (selectedDeviceId && data.device_id === selectedDeviceId) {
        loadData();
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [selectedDeviceId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('fall.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('fall.subtitle')}
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {selectedDeviceId && <FallAlertBanner deviceId={selectedDeviceId} />}

      {/* Motion Vectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accelerometer Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3-Axis Accelerometer (MPU-6050)
              </h3>
              <span className="text-[11px] text-slate-400">Impact vector and gravity reference</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {['X', 'Y', 'Z'].map((axis) => (
              <div key={axis} className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
                <span className="text-xs font-bold text-slate-400">{axis}-Axis</span>
                <div className="text-xl font-black mt-1 font-mono text-slate-800 dark:text-slate-100">
                  {telemetry?.mpu6050_acc?.value !== null && telemetry?.mpu6050_acc?.value !== undefined
                    ? `${telemetry.mpu6050_acc.value.toFixed(2)}`
                    : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">g (m/s²)</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-darkbg-border/60 text-[11px] text-slate-500 flex justify-between">
            <span>Free-fall threshold: &lt; 0.4g</span>
            <span>Impact threshold: &gt; 2.5g</span>
          </div>
        </div>

        {/* Gyroscope Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3-Axis Gyroscope (MPU-6050)
              </h3>
              <span className="text-[11px] text-slate-400">Angular rotational velocity</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {['Roll (X)', 'Pitch (Y)', 'Yaw (Z)'].map((axis) => (
              <div key={axis} className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
                <span className="text-[11px] font-bold text-slate-400">{axis}</span>
                <div className="text-xl font-black mt-1 font-mono text-slate-800 dark:text-slate-100">
                  {telemetry?.mpu6050_gyro?.value !== null && telemetry?.mpu6050_gyro?.value !== undefined
                    ? `${telemetry.mpu6050_gyro.value.toFixed(1)}`
                    : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">deg/s</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-darkbg-border/60 text-[11px] text-slate-500 flex justify-between">
            <span>Angular rate threshold: &gt; 200°/s</span>
            <span>Attitude update: 20 Hz</span>
          </div>
        </div>
      </div>

      {/* Safety Workflow Checklist */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Autonomous Safety & Fall Escalation Protocol
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Vector Evaluation</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              High-G impact followed by orientation tilt change triggers POSSIBLE fall event.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">2</span>
              <span>20s Grace Window</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Farmer has 20 seconds to press cancel on the dashboard or hardware button.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Emergency Interlock</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Pump OFF command issued immediately to prevent toxic chemical drowning/spill.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">4</span>
              <span>Family Notification</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Buzzer sounds at 85dB and emergency SMS with GPS coordinates dispatched to kin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
