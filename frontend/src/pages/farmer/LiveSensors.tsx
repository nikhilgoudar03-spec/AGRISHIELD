import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Thermometer, Droplets, Compass, RefreshCw, BarChart3, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../services/api';
import { Device, LatestTelemetry, SensorReading } from '../../types';
import { SensorCard } from '../../components/SensorCard';
import { StatusBadge } from '../../components/StatusBadge';
import { useWebSocket } from '../../context/WebSocketContext';

export const LiveSensors: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState<LatestTelemetry | null>(null);
  const [activeChartSensor, setActiveChartSensor] = useState<string>('MQ135');
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const devList = await api.getDevices();
      setDevices(devList);
      if (devList.length > 0) {
        const devId = selectedDeviceId || devList[0].id;
        if (!selectedDeviceId) setSelectedDeviceId(devId);

        const [telData, histData] = await Promise.all([
          api.getLatestTelemetry(devId).catch(() => null),
          api.getSensorHistory(devId, activeChartSensor, 40).catch(() => [])
        ]);
        setTelemetry(telData);
        setHistory(histData);
      }
    } catch (err) {
      console.error('Failed to load sensor telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);

    const unsub = subscribe('TELEMETRY_UPDATE', (data) => {
      if (selectedDeviceId && data.device_id === selectedDeviceId) {
        loadData();
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [selectedDeviceId, activeChartSensor]);

  const chartData = history.map((item) => ({
    time: new Date(item.server_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: item.value,
    raw_adc: item.raw_adc,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('sensors.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('sensors.subtitle')}
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

      {/* Sensor Cards Grid */}
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
          notes="Ambient temperature in Celsius"
          colorScheme="blue"
        />

        <SensorCard
          title={t('sensors.humTitle')}
          icon={Droplets}
          reading={telemetry?.dht11_hum}
          notes="Relative air humidity percentage"
          colorScheme="green"
        />

        <SensorCard
          title={t('sensors.motionTitle')}
          icon={Compass}
          reading={telemetry?.mpu6050_acc}
          notes={`Dynamic state: ${telemetry?.movement_status || 'NO DATA'}`}
          colorScheme="purple"
        />
      </div>

      {/* Actual Sensor History Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Historical Telemetry Stream
              </h3>
              <span className="text-[11px] text-slate-400">
                Plotted from verified database records only
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'MQ135', label: 'MQ-135 (Gas)' },
              { id: 'DHT11_TEMP', label: 'DHT11 Temp (°C)' },
              { id: 'DHT11_HUM', label: 'DHT11 Humidity (%)' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setActiveChartSensor(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeChartSensor === btn.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 dark:border-darkbg-border rounded-2xl">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              NO DATA AVAILABLE - No historical records for {activeChartSensor} in the database yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Connect your ESP32 hardware or send telemetry to begin real-time plotting.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="time" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
