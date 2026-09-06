import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Database, ExternalLink, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import {
  getCustomSupabaseCredentials,
  saveCustomSupabaseCredentials,
  isSupabaseConfigured,
  testSupabaseConnection,
} from '../lib/supabase';
import { copyToClipboard } from '../lib/reportUtils';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- ♟️ MY CHESS WORK MANAGER: POSTGRESQL TABLE & RLS POLICIES
create table if not exists batches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  work_date date not null,
  start_time text not null,
  end_time text not null,
  class_name text not null,
  topic text not null,
  homework text default '',
  class_type text check (class_type in ('general', 'demo')) not null default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast queries by user and date
create index if not exists idx_batches_user_date on batches(user_id, work_date);

-- Enable Row Level Security (RLS)
alter table batches enable row level security;

-- Strict private user isolation policies (idempotent with DROP POLICY IF EXISTS)
drop policy if exists "Users can view their own batches" on batches;
create policy "Users can view their own batches"
on batches for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own batches" on batches;
create policy "Users can insert their own batches"
on batches for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own batches" on batches;
create policy "Users can update their own batches"
on batches for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own batches" on batches;
create policy "Users can delete their own batches"
on batches for delete
using (auth.uid() = user_id);
`;

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onCredentialsUpdated,
}) => {
  const [url, setUrl] = useState<string>('');
  const [anonKey, setAnonKey] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tableExists?: boolean;
  } | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getCustomSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    const success = await copyToClipboard(SUPABASE_SCHEMA_SQL);
    if (success) {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to connect to Supabase.',
        tableExists: false,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      saveCustomSupabaseCredentials(url, anonKey);
      onCredentialsUpdated();
      setTestResult({
        success: true,
        message: 'Configuration saved! Ready to connect & sync batches with Supabase.',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to save configuration.',
      });
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div
      id="supabase-setup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="supabase-setup-container"
        className="w-full max-w-2xl rounded-lg bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-900 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Supabase PostgreSQL & RLS Setup
              </h3>
              <p className="text-xs text-slate-500">
                {isConfigured ? '🟢 Connected to Supabase' : '⚪ Operating in Local Private Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Instructions */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Step 1: Run SQL Schema in Supabase SQL Editor</span>
            </div>
            <p className="text-slate-600">
              Paste this schema into your Supabase project's SQL editor. It automatically creates the{' '}
              <code className="text-blue-600 font-bold">batches</code> table and enforces Row Level Security (RLS) so only your authenticated user ID can access your chess batches.
            </p>
            <div className="relative mt-2">
              <pre className="p-3 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-40">
                {SUPABASE_SCHEMA_SQL}
              </pre>
              <button
                id="copy-sql-schema-btn"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Credentials Configuration */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Step 2: Supabase Credentials</span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Project URL (VITE_SUPABASE_URL)</label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Public Anon Key (VITE_SUPABASE_ANON_KEY)</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                🔒 Safe to use public anon key with RLS. Secret service-role key is never exposed.
              </p>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-2.5 rounded-md border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                id="test-supabase-creds-btn"
                onClick={handleTestConnection}
                disabled={testing || !url.trim() || !anonKey.trim()}
                className="flex-1 py-2 rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                id="save-supabase-creds-btn"
                type="button"
                onClick={handleSave}
                disabled={saving || !url.trim() || !anonKey.trim()}
                className="flex-1 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                {saving ? 'Saving...' : 'Save & Connect'}
              </button>
            </div>
          </div>

          {/* Setup tips */}
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-blue-950">
              💡 Pro-Tip for Instant Sign-In:
            </p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              If you prefer not to verify emails every time you log in, open your Supabase Dashboard &gt; <b>Authentication</b> &gt; <b>Providers</b> &gt; <b>Email</b>, and toggle off <b>Confirm email</b>. This enables immediate account creation and login!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
