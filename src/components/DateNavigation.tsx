import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search } from 'lucide-react';
import { formatFullHeaderDate, isToday, addDays } from '../lib/dateUtils';
import { WeekdayThemeConfig } from '../types';

interface DateNavigationProps {
  currentDateStr: string;
  onDateChange: (dateStr: string) => void;
  onGoToToday: () => void;
  onOpenSearch: () => void;
  batchCount: number;
  theme: WeekdayThemeConfig;
}

export const DateNavigation: React.FC<DateNavigationProps> = ({
  currentDateStr,
  onDateChange,
  onGoToToday,
  onOpenSearch,
  batchCount,
  theme,
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const isCurrentDayToday = isToday(currentDateStr);
  const formattedFullDate = formatFullHeaderDate(currentDateStr);

  const handlePrevDay = () => {
    onDateChange(addDays(currentDateStr, -1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(currentDateStr, 1));
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onDateChange(e.target.value);
    }
  };

  return (
    <nav
      id="daily-workspace-header"
      className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Previous Day */}
          <button
            id="prev-day-btn"
            onClick={handlePrevDay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-98"
            title="Go to Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Day</span>
          </button>

          {/* Today Button */}
          <button
            id="today-btn"
            onClick={onGoToToday}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs active:scale-98 ${
              isCurrentDayToday
                ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100/80 ring-1 ring-blue-400/20'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
            title="Jump to Today's Date"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>

          {/* Next Day */}
          <button
            id="next-day-btn"
            onClick={handleNextDay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-98"
            title="Go to Next Day"
          >
            <span>Next Day</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Calendar picker hidden input & button */}
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date"
              value={currentDateStr}
              onChange={handleDatePickerChange}
              className="sr-only"
              id="calendar-date-picker-input"
            />
            <button
              id="open-calendar-picker-btn"
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
              title="Select specific date from calendar"
            >
              <CalendarIcon className="w-4 h-4 text-amber-600" />
            </button>
          </div>

          {/* Search History Button */}
          <button
            id="search-history-btn"
            onClick={onOpenSearch}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title="Search classes and homework in history"
          >
            <Search className="w-4 h-4 text-blue-600" />
          </button>
        </div>

        {/* Date Display */}
        <div className="text-left md:text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Active Date
          </div>
          <div
            id="workspace-current-date-title"
            className="text-base sm:text-lg font-bold text-slate-800 flex items-center md:justify-end gap-2 flex-wrap"
          >
            <span>{formattedFullDate}</span>
            {isCurrentDayToday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                TODAY
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {batchCount} {batchCount === 1 ? 'batch' : 'batches'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};
