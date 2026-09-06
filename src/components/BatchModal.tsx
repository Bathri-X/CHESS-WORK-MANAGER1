import React, { useState, useEffect } from 'react';
import { X, Clock, User, BookOpen, FileText, Check, Sparkles } from 'lucide-react';
import { Batch, BatchType, WeekdayThemeConfig } from '../types';
import { to12Hour, to24Hour, calculateEndTime } from '../lib/dateUtils';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (batchData: Omit<Batch, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<void>;
  editingBatch?: Batch | null;
  workDate: string;
  theme: WeekdayThemeConfig;
}

export const BatchModal: React.FC<BatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBatch,
  workDate,
  theme,
}) => {
  const [classType, setClassType] = useState<BatchType>('general');
  const [startTime24, setStartTime24] = useState<string>('06:00');
  const [endTime24, setEndTime24] = useState<string>('07:00');
  const [className, setClassName] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [homework, setHomework] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (editingBatch) {
      setClassType(editingBatch.class_type);
      setStartTime24(to24Hour(editingBatch.start_time));
      setEndTime24(to24Hour(editingBatch.end_time));
      setClassName(editingBatch.class_name);
      setTopic(editingBatch.topic);
      setHomework(editingBatch.homework || '');
    } else {
      // Default for new batch
      setClassType('general');
      const defaultStart = '06:00';
      setStartTime24(defaultStart);
      setEndTime24(calculateEndTime(defaultStart, 60));
      setClassName('');
      setTopic('');
      setHomework('');
    }
    setValidationError('');
  }, [editingBatch, isOpen]);

  // When class type changes, adjust duration default if adding new batch
  const handleTypeChange = (newType: BatchType) => {
    setClassType(newType);
    if (!editingBatch) {
      const duration = newType === 'demo' ? 30 : 60;
      setEndTime24(calculateEndTime(startTime24, duration));
    }
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime24(val);
    const duration = classType === 'demo' ? 30 : 60;
    setEndTime24(calculateEndTime(val, duration));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setValidationError('Please enter a Class / Student name.');
      return;
    }
    if (!topic.trim()) {
      setValidationError('Please enter a Topic.');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);

    try {
      await onSave({
        id: editingBatch?.id,
        work_date: editingBatch ? editingBatch.work_date : workDate,
        start_time: to12Hour(startTime24),
        end_time: to12Hour(endTime24),
        class_name: className.trim(),
        topic: topic.trim(),
        homework: classType === 'demo' ? '' : homework.trim(),
        class_type: classType,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isDemo = classType === 'demo';

  return (
    <div
      id="batch-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in"
    >
      <div
        id="batch-modal-container"
        className="w-full max-w-lg rounded-lg bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl transition-colors text-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">♟️</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {editingBatch ? 'Edit Batch' : 'Add New Batch'}
              </h3>
              <p className="text-xs text-slate-500">Date: {workDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-600">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Batch Type Switcher [ GENERAL ] / [ DEMO ] */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Batch Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-md bg-slate-100 border border-slate-200">
              <button
                type="button"
                id="modal-type-general"
                onClick={() => handleTypeChange('general')}
                className={`py-2 px-3 rounded text-xs font-bold transition-all cursor-pointer ${
                  !isDemo
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GENERAL (1 Hour)
              </button>
              <button
                type="button"
                id="modal-type-demo"
                onClick={() => handleTypeChange('demo')}
                className={`py-2 px-3 rounded text-xs font-bold transition-all cursor-pointer ${
                  isDemo
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-purple-700'
                }`}
              >
                DEMO (30 Mins)
              </button>
            </div>
            {isDemo && (
              <p className="mt-1 text-[11px] text-purple-600">
                ⭐ Demo batches are excluded from the WhatsApp daily report and count as 0.5 toward Grand classes.
              </p>
            )}
          </div>

          {/* Time From – To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Start Time
              </label>
              <div className="relative">
                <input
                  id="batch-start-time"
                  type="time"
                  required
                  value={startTime24}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {to12Hour(startTime24)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                End Time
              </label>
              <div className="relative">
                <input
                  id="batch-end-time"
                  type="time"
                  required
                  value={endTime24}
                  onChange={(e) => setEndTime24(e.target.value)}
                  className="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {to12Hour(endTime24)}
              </span>
            </div>
          </div>

          {/* Class / Student */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Class / Student Name <span className="text-red-500">*</span>
            </label>
            <input
              id="batch-student-name"
              type="text"
              required
              placeholder="e.g. Vedh - VS"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full rounded-md bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              id="batch-topic"
              type="text"
              required
              placeholder="e.g. Zugzwang, Rook Endgames, Sicilian Defense"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-md bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          {/* Homework (Not required/hidden for Demo as requested in prompt) */}
          {!isDemo && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Homework
              </label>
              <textarea
                id="batch-homework"
                rows={3}
                placeholder="e.g. Zugzwang (5) – All Sections"
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                className="w-full rounded-md bg-slate-50 border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400 resize-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-batch-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isDemo
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
              }`}
            >
              {isSubmitting ? 'Saving...' : editingBatch ? 'Update Batch' : 'Add Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
