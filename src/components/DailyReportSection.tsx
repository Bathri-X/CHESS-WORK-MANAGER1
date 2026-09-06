import React, { useState } from 'react';
import { Copy, MessageSquare, Check, ShieldAlert, FileText } from 'lucide-react';
import { Batch, WeekdayThemeConfig } from '../types';
import { generateDailyReport, copyToClipboard, shareToWhatsApp } from '../lib/reportUtils';

interface DailyReportSectionProps {
  currentDateStr: string;
  batches: Batch[];
  theme: WeekdayThemeConfig;
}

export const DailyReportSection: React.FC<DailyReportSectionProps> = ({
  currentDateStr,
  batches,
  theme,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Generates live report text strictly excluding Demo classes
  const reportText = generateDailyReport(currentDateStr, batches);

  // Count Demo and General classes for this day
  const dayBatches = batches.filter((b) => b.work_date === currentDateStr);
  const generalCount = dayBatches.filter((b) => b.class_type === 'general').length;
  const demoCount = dayBatches.filter((b) => b.class_type === 'demo').length;

  const handleCopy = async () => {
    const success = await copyToClipboard(reportText);
    if (success) {
      setCopied(true);
      setToastMessage('Daily report copied!');
      setTimeout(() => {
        setCopied(false);
        setToastMessage('');
      }, 3000);
    } else {
      setToastMessage('Failed to copy to clipboard.');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleShare = async () => {
    await shareToWhatsApp(reportText);
  };

  return (
    <section
      id="daily-whatsapp-report-section"
      className="w-full rounded-lg bg-white border border-slate-200 p-5 shadow-2xs"
    >
      {/* Toast alert */}
      {toastMessage && (
        <div
          id="copy-toast-alert"
          className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-3"
        >
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              DAILY REPORT / WHATSAPP
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Auto-generated live report for General batches • {generalCount} classes included
          </p>
        </div>

        {/* Demo exclusion note pill */}
        {demoCount > 0 && (
          <div
            id="demo-excluded-badge"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 self-start sm:self-auto"
          >
            <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
            <span>{demoCount} DEMO EXCLUDED</span>
          </div>
        )}
      </div>

      {/* Live Preview Box */}
      <div className="mt-4 relative">
        <div
          id="daily-report-preview-text"
          className="w-full rounded-md bg-slate-50 border border-slate-200 p-4 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner max-h-80 overflow-y-auto"
        >
          {reportText}
        </div>
      </div>

      {/* Action Buttons: [ 📋 COPY REPORT ] [ 💬 SHARE TO WHATSAPP ] */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          id="copy-report-btn"
          onClick={handleCopy}
          className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 active:scale-98 text-white border border-slate-700 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Daily report copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>📋 COPY REPORT</span>
            </>
          )}
        </button>

        <button
          id="share-whatsapp-btn"
          onClick={handleShare}
          className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>💬 SHARE TO WHATSAPP</span>
        </button>
      </div>
    </section>
  );
};
