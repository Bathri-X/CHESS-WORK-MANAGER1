import React, { useState, useMemo } from 'react';
import { X, Search, Calendar, User, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { Batch } from '../types';
import { formatFullHeaderDate } from '../lib/dateUtils';

interface HistorySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  onSelectDate: (dateStr: string) => void;
}

export const HistorySearchModal: React.FC<HistorySearchModalProps> = ({
  isOpen,
  onClose,
  batches,
  onSelectDate,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'general' | 'demo'>('all');

  const filteredBatches = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return batches.filter((b) => {
      if (filterType !== 'all' && b.class_type !== filterType) return false;
      if (!term) return true;
      return (
        b.class_name.toLowerCase().includes(term) ||
        b.topic.toLowerCase().includes(term) ||
        (b.homework && b.homework.toLowerCase().includes(term)) ||
        b.work_date.includes(term)
      );
    });
  }, [batches, searchTerm, filterType]);

  // Group filtered batches by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Batch[]>();
    for (const b of filteredBatches) {
      const list = map.get(b.work_date) || [];
      list.push(b);
      map.set(b.work_date, list);
    }
    // Sort dates descending
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredBatches]);

  if (!isOpen) return null;

  return (
    <div
      id="history-search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="history-search-container"
        className="w-full max-w-2xl rounded-lg bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-900 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔎</span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Search Classes & History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input & Filters */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              autoFocus
              placeholder="Search student name, topic, homework or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter:</span>
            {(['all', 'general', 'demo'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  filterType === type
                    ? type === 'demo'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
            <span className="ml-auto text-slate-500 text-[11px]">
              {filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'} found
            </span>
          </div>
        </div>

        {/* Results List */}
        <div className="mt-4 overflow-y-auto flex-1 pr-1 space-y-4">
          {groupedByDate.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">No batches match your search criteria.</p>
            </div>
          ) : (
            groupedByDate.map(([dateStr, dateBatches]) => (
              <div
                key={dateStr}
                className="rounded-lg bg-slate-50 border border-slate-200 p-3.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatFullHeaderDate(dateStr)}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-normal">
                      {dateBatches.length} {dateBatches.length === 1 ? 'batch' : 'batches'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectDate(dateStr);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <span>View Day</span>
                    <ArrowRight className="w-3 h-3 text-blue-600" />
                  </button>
                </div>

                <div className="mt-2.5 space-y-2">
                  {dateBatches.map((b) => {
                    const isDemo = b.class_type === 'demo';
                    return (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isDemo
                            ? 'bg-purple-50/60 border-purple-200 border-l-2 border-l-purple-600 text-purple-900'
                            : 'bg-white border-slate-200 border-l-2 border-l-blue-600 text-slate-800'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                            <span>{b.class_name}</span>
                            {isDemo && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-600 text-white">
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600">
                            Topic: <span className="text-slate-800 font-medium">{b.topic}</span>
                          </div>
                          {!isDemo && b.homework && (
                            <div className="text-slate-600 line-clamp-1">
                              HW: <span className="text-slate-800">{b.homework}</span>
                            </div>
                          )}
                        </div>

                        <div className="font-mono text-xs font-semibold text-slate-500 shrink-0">
                          {b.start_time} – {b.end_time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
