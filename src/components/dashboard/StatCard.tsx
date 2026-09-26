import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.FC<{ className?: string }>;
  color: 'amber' | 'emerald' | 'blue' | 'purple' | 'red' | 'indigo' | 'cyan';
  trend?: string;
  isPositive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  isPositive,
}) => {
  const colorMap = {
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/80 dark:border-amber-800/40',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/80 dark:border-emerald-800/40',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/80 dark:border-blue-800/40',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200/80 dark:border-purple-800/40',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    },
    red: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200/80 dark:border-rose-800/40',
      iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200/80 dark:border-indigo-800/40',
      iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    },
    cyan: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-200/80 dark:border-cyan-800/40',
      iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    },
  };

  const scheme = colorMap[color] || colorMap.amber;

  return (
    <div
      className={`p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {title}
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
            {value}
          </h3>
        </div>

        <div className={`p-2.5 rounded-xl ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 line-clamp-1">{subtitle}</span>
          )}
          {trend && (
            <span
              className={`font-semibold ml-auto ${
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
