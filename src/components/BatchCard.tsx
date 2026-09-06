import React from 'react';
import { Clock, User, BookOpen, FileText, Edit3, Trash2, Copy, Sparkles } from 'lucide-react';
import { Batch } from '../types';

interface BatchCardProps {
  batch: Batch;
  onEdit: (batch: Batch) => void;
  onDuplicate: (batch: Batch) => void;
  onRequestDelete: (batch: Batch) => void;
  onToggleType: (batch: Batch) => void;
}

export const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  onEdit,
  onDuplicate,
  onRequestDelete,
  onToggleType,
}) => {
  const isDemo = batch.class_type === 'demo';

  return (
    <div
      id={`batch-card-${batch.id}`}
      className={`rounded-lg p-4 sm:p-5 shadow-2xs border transition-all duration-150 ${
        isDemo
          ? 'bg-purple-50/60 border-purple-200 border-l-4 border-l-purple-600 text-slate-900'
          : 'bg-white border-slate-200 border-l-4 border-l-blue-600 text-slate-900'
      }`}
    >
      {/* Top Header: Badge, Time Range + Quick Type Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {isDemo ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-purple-600 text-white shadow-2xs">
              DEMO
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-700 border border-blue-200">
              GENERAL
            </span>
          )}

          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {batch.start_time} – {batch.end_time}
            </span>
          </div>
        </div>

        {/* Small Toggle Button: [ GENERAL ] / [ DEMO ] */}
        <div className="flex items-center gap-1.5">
          <div
            id={`toggle-type-container-${batch.id}`}
            className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200 text-xs"
          >
            <button
              id={`toggle-general-${batch.id}`}
              onClick={() => {
                if (isDemo) onToggleType(batch);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                !isDemo
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              GENERAL
            </button>
            <button
              id={`toggle-demo-${batch.id}`}
              onClick={() => {
                if (!isDemo) onToggleType(batch);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                isDemo
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-purple-700'
              }`}
            >
              DEMO
            </button>
          </div>
        </div>
      </div>

      {/* Main Details */}
      <div className="mt-3 space-y-2">
        {/* Student / Class */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Class / Student
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-800">
            {batch.class_name}
          </div>
        </div>

        {/* Topic */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Topic
          </div>
          <div className="text-xs sm:text-sm text-slate-700 font-medium">
            {batch.topic || 'No topic specified'}
          </div>
        </div>

        {/* Homework (Hidden for DEMO classes as required by prompt) */}
        {!isDemo && (
          <div className="mt-2.5 p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-md text-xs text-slate-600">
            <span className="font-bold text-slate-700 mr-1.5">Homework:</span>
            <span>
              {batch.homework && batch.homework.trim().length > 0
                ? batch.homework
                : 'No homework assigned'}
            </span>
          </div>
        )}
      </div>

      {/* Action Footer: Edit, Duplicate, Delete */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
        <button
          id={`duplicate-batch-btn-${batch.id}`}
          onClick={() => onDuplicate(batch)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Duplicate this batch"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicate</span>
        </button>

        <button
          id={`edit-batch-btn-${batch.id}`}
          onClick={() => onEdit(batch)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer font-semibold"
          title="Edit batch details"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          id={`delete-batch-btn-${batch.id}`}
          onClick={() => onRequestDelete(batch)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer font-semibold"
          title="Delete batch (Requires PIN 0000)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
