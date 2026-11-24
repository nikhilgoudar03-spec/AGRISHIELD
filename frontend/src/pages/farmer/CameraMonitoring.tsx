import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Image, CheckCircle, AlertTriangle, RefreshCw, Eye, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { Device, CameraImage } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { useWebSocket } from '../../context/WebSocketContext';

export const CameraMonitoring: React.FC = () => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [cameraStatus, setCameraStatus] = useState<string>('OFFLINE');
  const [latestImage, setLatestImage] = useState<CameraImage | null>(null);
  const [gallery, setGallery] = useState<CameraImage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCameraData = async () => {
    try {
      const devList = await api.getDevices();
      setDevices(devList);
      if (devList.length > 0) {
        const devId = selectedDeviceId || devList[0].id;
        if (!selectedDeviceId) setSelectedDeviceId(devId);

        const [camInfo, history] = await Promise.all([
          api.getLatestCamera(devId).catch(() => ({ device_id: devId, camera_status: 'OFFLINE', image: null })),
          api.getCameraHistory(devId, 12).catch(() => [])
        ]);

        setCameraStatus(camInfo.camera_status);
        setLatestImage(camInfo.image);
        setGallery(history);
      }
    } catch (err) {
      console.error('Failed to load camera data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameraData();
    const interval = setInterval(loadCameraData, 10000);

    const unsub = subscribe('CAMERA_IMAGE_UPLOADED', (data) => {
      if (selectedDeviceId && data.device_id === selectedDeviceId) {
        loadCameraData();
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
            {t('camera.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('camera.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={cameraStatus === 'ONLINE' ? 'ONLINE' : 'OFFLINE'} size="md" />
          <button
            onClick={loadCameraData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50 dark:bg-darkbg-surface text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport & Analysis Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-600" />
              <span>Latest Verified Camera Frame</span>
            </h3>
            {latestImage?.capture_timestamp && (
              <span className="text-xs font-mono text-slate-400">
                {new Date(latestImage.capture_timestamp).toLocaleString()}
              </span>
            )}
          </div>

          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center relative border border-slate-800">
            {cameraStatus === 'OFFLINE' && !latestImage ? (
              <div className="text-center p-6">
                <Camera className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <div className="text-sm font-bold text-rose-500">{t('camera.offlineMsg')}</div>
                <div className="text-xs text-slate-500 mt-1">Connect ESP32-CAM module to receive visual feed</div>
              </div>
            ) : latestImage ? (
              <img
                src={latestImage.image_url.startsWith('http') ? latestImage.image_url : `http://localhost:8000${latestImage.image_url}`}
                alt="ESP32-CAM Capture"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="text-center p-6 text-slate-500 text-xs italic">
                NO DATA AVAILABLE - Awaiting initial camera capture upload from hardware.
              </div>
            )}

            {latestImage && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-[11px] font-mono flex items-center gap-2">
                <span>{(latestImage.file_size_bytes / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>OV2640 Sensor</span>
              </div>
            )}
          </div>
        </div>

        {/* OpenCV Spray Detection AI Panel */}
        <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  OpenCV Spray Analysis
                </h3>
                <span className="text-[11px] text-slate-500">Visual plume pattern classification</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-darkbg-surface border border-slate-200 dark:border-darkbg-border">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                  {t('camera.sprayStatus')}
                </span>
                {latestImage ? (
                  <div className="flex items-center gap-2 mt-1">
                    {latestImage.spray_detected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{t('camera.sprayDetected')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-darkbg-card px-2.5 py-1 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>{t('camera.noSpray')}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">No image analyzed yet</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                <strong>Safety Disclaimer:</strong> Visual plume detection monitors aerosol mist density dispersion using OpenCV gradient variance. It does not measure chemical toxicity or ppm concentration.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-darkbg-border text-[11px] text-slate-400 flex justify-between">
            <span>Vision Engine:</span>
            <span className="font-mono font-bold text-slate-600 dark:text-slate-300">OpenCV 4.10 Headless</span>
          </div>
        </div>
      </div>

      {/* Snapshot Gallery */}
      <div className="p-6 rounded-3xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          {t('camera.snapshotGallery')}
        </h3>

        {gallery.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-6 text-center">
            No incident snapshots recorded in the database yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {gallery.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-darkbg-border bg-slate-950 aspect-video flex items-center justify-center"
              >
                <img
                  src={img.image_url.startsWith('http') ? img.image_url : `http://localhost:8000${img.image_url}`}
                  alt="Snapshot"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-[10px] text-white font-mono">
                  <span>{new Date(img.server_timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
