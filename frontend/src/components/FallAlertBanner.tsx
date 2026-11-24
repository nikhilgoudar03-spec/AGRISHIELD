import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, CheckCircle, Volume2 } from 'lucide-react';
import { api } from '../services/api';
import { FallEvent } from '../types';
import { useWebSocket } from '../context/WebSocketContext';

interface FallAlertBannerProps {
  deviceId?: number;
}

export const FallAlertBanner: React.FC<FallAlertBannerProps> = ({ deviceId }) => {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();
  const [activeFall, setActiveFall] = useState<FallEvent | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState(false);

  const checkPendingFall = async () => {
    if (!deviceId) return;
    try {
      const fall = await api.getActiveFall(deviceId);
      if (fall) {
        setActiveFall(fall);
        setSecondsLeft(fall.seconds_remaining || 20);
      } else {
        setActiveFall(null);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    checkPendingFall();
    const interval = setInterval(checkPendingFall, 5000);

    const unsubscribe = subscribe('TELEMETRY_UPDATE', (data) => {
      if (data.fall_detected) {
        checkPendingFall();
      }
    });

    const unsubscribeCancel = subscribe('FALL_CANCELLED', () => {
      setActiveFall(null);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
      unsubscribeCancel();
    };
  }, [deviceId]);

  // Countdown timer
  useEffect(() => {
    if (!activeFall || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          checkPendingFall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeFall, secondsLeft]);

  const handleCancelAlarm = async () => {
    if (!activeFall) return;
    setIsCancelling(true);
    try {
      await api.cancelFall(activeFall.id, 'Farmer clicked I AM SAFE on dashboard.');
      setActiveFall(null);
    } catch (err) {
      console.error('Failed to cancel fall alarm:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  if (!activeFall) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white shadow-xl animate-pulse flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-rose-300">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
          <AlertOctagon className="w-7 h-7 text-white animate-bounce" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-black tracking-wide uppercase">
              {t('fall.possibleFall')}
            </h4>
            <span className="px-2 py-0.5 rounded bg-black/40 text-xs font-mono font-bold">
              {secondsLeft}s {t('fall.cancellationTimer')}
            </span>
          </div>
          <p className="text-xs text-rose-100 font-medium">
            Abnormal MPU-6050 impact vector detected. If you are safe, tap the button below before the buzzer escalates to emergency services.
          </p>
        </div>
      </div>

      <button
        onClick={handleCancelAlarm}
        disabled={isCancelling}
        className="w-full md:w-auto px-6 py-3 rounded-xl bg-white text-rose-700 font-black text-sm hover:bg-rose-50 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5 text-emerald-600" />
        <span>{isCancelling ? 'Disarming...' : t('fall.cancelBtn')}</span>
      </button>
    </div>
  );
};
