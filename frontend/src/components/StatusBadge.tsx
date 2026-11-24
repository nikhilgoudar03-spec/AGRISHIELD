import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, AlertTriangle, AlertOctagon, WifiOff, HelpCircle, Activity, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const { t } = useTranslation();

  const getStyle = () => {
    switch (status) {
      case 'SAFE':
        return {
          bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400',
          dot: 'bg-emerald-500 animate-pulse',
          icon: ShieldCheck,
          label: t('status.safe')
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
          label: t('status.warning')
        };
      case 'EMERGENCY':
        return {
          bg: 'bg-rose-500/15 text-rose-600 border-rose-500/40 dark:bg-rose-500/25 dark:text-rose-400 animate-pulse',
          dot: 'bg-rose-600 animate-ping',
          icon: AlertOctagon,
          label: t('status.emergency')
        };
      case 'DEVICE OFFLINE':
      case 'OFFLINE':
        return {
          bg: 'bg-slate-500/10 text-slate-500 border-slate-500/30 dark:bg-slate-800 dark:text-slate-400',
          dot: 'bg-slate-400',
          icon: WifiOff,
          label: t('status.deviceOffline')
        };
      case 'LIVE':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
          dot: 'bg-emerald-500',
          icon: Activity,
          label: t('status.live')
        };
      case 'STALE':
      case 'STALE DATA':
        return {
          bg: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400',
          dot: 'bg-orange-500',
          icon: Clock,
          label: t('status.stale')
        };
      case 'NO DATA AVAILABLE':
      case 'NO DATA':
      default:
        return {
          bg: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30 dark:bg-zinc-800 dark:text-zinc-400',
          dot: 'bg-zinc-400',
          icon: HelpCircle,
          label: t('status.noData')
        };
    }
  };

  const config = getStyle();
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs font-semibold px-2.5 py-1 gap-2',
    lg: 'text-sm font-bold px-3.5 py-1.5 gap-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-200 ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {showIcon && <IconComponent className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
};
