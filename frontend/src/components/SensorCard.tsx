import React from 'react';
import { LucideIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SensorReading } from '../types';

interface SensorCardProps {
  title: string;
  icon: LucideIcon;
  reading?: SensorReading | null;
  rawAdcLabel?: string;
  notes?: string;
  colorScheme?: 'green' | 'blue' | 'amber' | 'purple';
}

export const SensorCard: React.FC<SensorCardProps> = ({
  title,
  icon: Icon,
  reading,
  rawAdcLabel,
  notes,
  colorScheme = 'green'
}) => {
  const hasReading = reading && reading.value !== null && reading.value !== undefined;
  const status = reading ? reading.validity_status : 'NO_DATA';

  const colorStyles = {
    green: 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
    blue: 'border-sky-200 dark:border-sky-950/60 bg-sky-50/30 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400',
    amber: 'border-amber-200 dark:border-amber-950/60 bg-amber-50/30 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
    purple: 'border-purple-200 dark:border-purple-950/60 bg-purple-50/30 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400',
  }[colorScheme];

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${colorStyles}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h4>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                {reading?.sensor_id || 'SENSOR'}
              </span>
            </div>
          </div>
          <StatusBadge status={status} size="sm" />
        </div>

        <div className="my-3">
          {hasReading ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {typeof reading.value === 'number' ? reading.value.toFixed(1) : reading.value}
              </span>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {reading.unit}
              </span>
            </div>
          ) : (
            <div className="py-2 text-sm font-semibold text-slate-400 dark:text-slate-500 italic">
              NO DATA AVAILABLE
            </div>
          )}

          {reading?.raw_adc !== undefined && reading?.raw_adc !== null && (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="text-slate-400">{rawAdcLabel || 'Raw ADC'}:</span>
              <span className="font-mono font-bold bg-slate-100 dark:bg-darkbg-surface px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                {reading.raw_adc} / 4095
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-slate-100 dark:border-darkbg-border/60 flex flex-col gap-1 text-[11px]">
        {notes && (
          <p className="text-slate-400 dark:text-slate-500 italic leading-tight">
            {notes}
          </p>
        )}
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>Last Recorded:</span>
          <span className="font-mono">
            {reading?.server_timestamp 
              ? new Date(reading.server_timestamp).toLocaleTimeString() 
              : 'Never'}
          </span>
        </div>
      </div>
    </div>
  );
};
