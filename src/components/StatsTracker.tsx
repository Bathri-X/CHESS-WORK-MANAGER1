import React from 'react';
import { TrackingPeriod, TrackingStats, WeekdayThemeConfig } from '../types';

interface StatsTrackerProps {
  period: TrackingPeriod;
  onPeriodChange: (p: TrackingPeriod) => void;
  stats: TrackingStats;
  theme: WeekdayThemeConfig;
  currentDateStr: string;
}

export const StatsTracker: React.FC<StatsTrackerProps> = ({
  period,
  onPeriodChange,
  stats,
  theme,
}) => {
  const periods: { id: TrackingPeriod; label: string }[] = [
    { id: 'MONTHLY', label: 'MONTHLY' },
    { id: 'YEARLY', label: 'YEARLY' },
    { id: 'SO_FAR', label: 'SO FAR' },
  ];

  // Format Grand total nicely (e.g. integer or with .5)
  const displayGrand = Number.isInteger(stats.grand)
    ? stats.grand.toString()
    : stats.grand.toFixed(1);

  const headerBg = theme.headerBgClass || 'bg-blue-600';

  return (
    <header
      id="class-stats-tracker"
      className={`w-full ${headerBg} text-white p-5 sm:p-6 shadow-md transition-colors`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Brand & Workspace Status */}
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl drop-shadow-xs">♟️</span>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase">
                My Chess Work Manager
              </h1>
              <p className="text-white/80 text-xs font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                <span>PRIVATE WORKSPACE</span>
                <span>•</span>
                <span>PERSISTENT SESSION ACTIVE</span>
              </p>
            </div>
          </div>

          {/* View Switcher buttons */}
          <div
            id="tracking-period-selector"
            className="flex bg-black/20 rounded-lg p-1 border border-white/20 text-xs self-start sm:self-auto backdrop-blur-xs"
          >
            {periods.map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  id={`period-btn-${p.id.toLowerCase()}`}
                  onClick={() => onPeriodChange(p.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Counters Grid */}
        <div className="grid grid-cols-3 mt-6 gap-3 sm:gap-4">
          {/* Grand Total */}
          <div className="bg-white/10 border border-white/20 p-3 sm:p-4 rounded-md">
            <span className="block text-[10px] uppercase font-bold opacity-80 tracking-wider">
              Grand Total
            </span>
            <span
              id="stat-grand-count"
              className="block mt-1 text-2xl sm:text-3xl font-black tracking-tight"
            >
              {displayGrand}
            </span>
            <span className="block text-[10px] opacity-70 mt-0.5">
              G + (D ÷ 2)
            </span>
          </div>

          {/* General Classes (G) */}
          <div className="bg-white/10 border border-white/20 p-3 sm:p-4 rounded-md">
            <span className="block text-[10px] uppercase font-bold opacity-80 tracking-wider">
              General Classes (G)
            </span>
            <span
              id="stat-general-count"
              className="block mt-1 text-2xl sm:text-3xl font-black tracking-tight"
            >
              {stats.general}
            </span>
            <span className="block text-[10px] opacity-70 mt-0.5">
              1.0 hr classes
            </span>
          </div>

          {/* Demo Classes (D) */}
          <div className="bg-white/10 border border-white/20 p-3 sm:p-4 rounded-md">
            <span className="block text-[10px] uppercase font-bold opacity-80 tracking-wider">
              Demo Classes (D)
            </span>
            <span
              id="stat-demo-count"
              className="block mt-1 text-2xl sm:text-3xl font-black tracking-tight"
            >
              {stats.demo}
            </span>
            <span className="block text-[10px] opacity-70 mt-0.5">
              0.5 credit each
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
