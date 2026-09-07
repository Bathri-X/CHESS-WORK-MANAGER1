/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Sparkles, Inbox, RefreshCw, Search } from 'lucide-react';
import { Batch, TrackingPeriod, UserProfile } from './types';
import { getTodayString, getWeekdayName, isToday } from './lib/dateUtils';
import { getThemeForWeekday } from './lib/themes';
import {
  fetchAllBatches,
  upsertBatch,
  deleteBatchWithPin,
  calculateTrackingStats,
  getSavedTrackingPeriod,
  saveTrackingPeriod,
  getLocalCachedBatches,
  setLocalCachedBatches,
  migrateLocalBatchesToCloud,
} from './lib/storage';
import { getSupabase, isSupabaseConfigured, generateUuid, isValidUuid } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { StatsTracker } from './components/StatsTracker';
import { DateNavigation } from './components/DateNavigation';
import { BatchCard } from './components/BatchCard';
import { BatchModal } from './components/BatchModal';
import { DeletePinModal } from './components/DeletePinModal';
import { DailyReportSection } from './components/DailyReportSection';
import { HistorySearchModal } from './components/HistorySearchModal';
import { AuthModal } from './components/AuthModal';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // 1. Timezone-aware date state (defaults to device today)
  const [currentDateStr, setCurrentDateStr] = useState<string>(getTodayString());

  // 2. Batches list
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // 3. User & Auth state
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Check if previously logged in as local user or supabase user
    const savedLocal = localStorage.getItem('chess_work_local_user');
    if (savedLocal) {
      try {
        return JSON.parse(savedLocal);
      } catch {
        return null;
      }
    }
    return { id: 'local_private_user', email: 'coach@chessmanager.private' };
  });

  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(isSupabaseConfigured());

  // 4. Tracking Period (Persistent via localStorage as required by Requirement 8)
  const [trackingPeriod, setTrackingPeriod] = useState<TrackingPeriod>(() =>
    getSavedTrackingPeriod()
  );

  // 5. Modals state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const [isDeletePinModalOpen, setIsDeletePinModalOpen] = useState<boolean>(false);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSupabaseSetupOpen, setIsSupabaseSetupOpen] = useState<boolean>(false);

  // 6. 7-Day Theme calculated dynamically from the currently viewed weekday
  const currentWeekday = useMemo(() => getWeekdayName(currentDateStr), [currentDateStr]);
  const theme = useMemo(() => getThemeForWeekday(currentWeekday), [currentWeekday]);

  // Handle tracking period switch with persistence
  const handlePeriodChange = (newPeriod: TrackingPeriod) => {
    setTrackingPeriod(newPeriod);
    saveTrackingPeriod(newPeriod);
  };

  // Seed sample starter batches ONLY in local/offline mode (not for authenticated Supabase users)
  const seedStarterBatchesIfEmpty = useCallback((existing: Batch[], forUserId?: string) => {
    // Never seed for authenticated Supabase users — their DB might just be empty
    if (forUserId && isValidUuid(forUserId)) {
      return existing;
    }
    if (existing.length === 0) {
      const today = getTodayString();
      const sampleBatches: Batch[] = [
        {
          id: generateUuid(),
          user_id: user?.id || 'local_private_user',
          work_date: today,
          start_time: '06:00 AM',
          end_time: '07:00 AM',
          class_name: 'Vedh - VS',
          topic: 'Zugzwang & King-Pawn Endgames',
          homework: 'Zugzwang (5) – All Sections',
          class_type: 'general',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: generateUuid(),
          user_id: user?.id || 'local_private_user',
          work_date: today,
          start_time: '07:15 AM',
          end_time: '07:45 AM',
          class_name: 'Aarav - Trial Student',
          topic: 'Evaluation of Center Control (Demo)',
          homework: '',
          class_type: 'demo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: generateUuid(),
          user_id: user?.id || 'local_private_user',
          work_date: today,
          start_time: '05:00 PM',
          end_time: '06:00 PM',
          class_name: 'Rohan - Intermediate',
          topic: 'Sicilian Defense: Dragon Variation Attack',
          homework: 'Solve 10 Tactical Puzzles on Chess.com',
          class_type: 'general',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setLocalCachedBatches(sampleBatches);
      return sampleBatches;
    }
    return existing;
  }, [user]);

  // Load batches on start or user change
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await fetchAllBatches(user?.id);
      const withSeed = seedStarterBatchesIfEmpty(loaded, user?.id);
      setBatches(withSeed);
    } catch (err: any) {
      console.warn('Error loading batches:', err);
      const cached = getLocalCachedBatches();
      setBatches(seedStarterBatchesIfEmpty(cached, user?.id));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, seedStarterBatchesIfEmpty]);

  // Check Supabase Auth Session on mount — auto-restore login if token is still valid
  useEffect(() => {
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          const profile: UserProfile = {
            id: data.session.user.id,
            email: data.session.user.email || 'user@supabase.io',
          };
          setUser(profile);
          setSupabaseConnected(true);
          localStorage.setItem('chess_work_local_user', JSON.stringify(profile));
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            const profile: UserProfile = {
              id: session.user.id,
              email: session.user.email || 'user@supabase.io',
            };
            setUser(profile);
            setSupabaseConnected(true);
            localStorage.setItem('chess_work_local_user', JSON.stringify(profile));
            if (event === 'SIGNED_IN') {
              const synced = await migrateLocalBatchesToCloud(session.user.id);
              setBatches(synced);
            }
          } else if (event === 'SIGNED_OUT') {
            // Revert to local user
            const localUser: UserProfile = {
              id: 'local_private_user',
              email: 'coach@chessmanager.private',
            };
            setUser(localUser);
            setSupabaseConnected(isSupabaseConfigured());
            localStorage.setItem('chess_work_local_user', JSON.stringify(localUser));
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter batches for the currently selected date
  const todayBatches = useMemo(() => {
    const list = batches.filter((b) => b.work_date === currentDateStr);
    return list.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [batches, currentDateStr]);

  // Calculate live tracking stats (Grand, G, D) for the active tracking view
  const trackingStats = useMemo(() => {
    return calculateTrackingStats(batches, trackingPeriod, currentDateStr);
  }, [batches, trackingPeriod, currentDateStr]);

  // Add or Edit batch save handler
  const handleSaveBatch = async (
    data: Omit<Batch, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => {
    const currentUserId = user?.id || 'local_private_user';
    const batchToSave: Batch = {
      id: data.id || crypto.randomUUID(),
      user_id: currentUserId,
      work_date: data.work_date,
      start_time: data.start_time,
      end_time: data.end_time,
      class_name: data.class_name,
      topic: data.topic,
      homework: data.homework,
      class_type: data.class_type,
      created_at: editingBatch ? editingBatch.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = await upsertBatch(batchToSave, currentUserId);
    setBatches((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });

    setStatusMessage('Batch saved successfully.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Quick toggle between General and Demo directly from the batch card
  const handleToggleBatchType = async (batch: Batch) => {
    const newType = batch.class_type === 'demo' ? 'general' : 'demo';
    const updated: Batch = {
      ...batch,
      class_type: newType,
      homework: newType === 'demo' ? '' : batch.homework,
      updated_at: new Date().toISOString(),
    };

    const saved = await upsertBatch(updated, user?.id || 'local_private_user');
    setBatches((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
  };

  // Duplicate batch
  const handleDuplicateBatch = async (batch: Batch) => {
    const duplicated: Batch = {
      ...batch,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const saved = await upsertBatch(duplicated, user?.id || 'local_private_user');
    setBatches((prev) => [...prev, saved]);
    setStatusMessage(`Duplicated batch for ${batch.class_name}.`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Secure Delete Confirmation with PIN
  const handleConfirmDelete = async (pin: string) => {
    if (!deletingBatch) return;
    // Strict backend PIN verification through /api/batches/delete
    await deleteBatchWithPin(deletingBatch.id, pin, user?.id);

    setBatches((prev) => prev.filter((b) => b.id !== deletingBatch.id));
    setDeletingBatch(null);
    setStatusMessage('Batch deleted successfully.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleSignOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    const localUser: UserProfile = {
      id: 'local_private_user',
      email: 'coach@chessmanager.private',
    };
    setUser(localUser);
    localStorage.setItem('chess_work_local_user', JSON.stringify(localUser));
    const cached = getLocalCachedBatches();
    setBatches(cached);
    setStatusMessage('Signed out. Operating in offline local mode.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        theme={theme}
        user={user}
        supabaseConnected={supabaseConnected}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSupabaseSetup={() => setIsSupabaseSetupOpen(true)}
        onSignOut={handleSignOut}
        onGoToToday={() => setCurrentDateStr(getTodayString())}
      />

      {/* 1. Monthly / Yearly / So Far Live Tracking (Requirement 7 & 8) */}
      <StatsTracker
        period={trackingPeriod}
        onPeriodChange={handlePeriodChange}
        stats={trackingStats}
        theme={theme}
        currentDateStr={currentDateStr}
      />

      {/* 2. Workspace Day Navigation (Requirement 2 & 6) */}
      <DateNavigation
        currentDateStr={currentDateStr}
        onDateChange={(newDate) => setCurrentDateStr(newDate)}
        onGoToToday={() => setCurrentDateStr(getTodayString())}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        batchCount={todayBatches.length}
        theme={theme}
      />

      {/* Status Toast Notification */}
      {statusMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-3">
          <div
            id="app-status-notification"
            className="rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-xs text-blue-700 shadow-2xs flex items-center justify-between animate-in fade-in"
          >
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage('')}
              className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Area: 2-Column Responsive Desktop Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:grid lg:grid-cols-12 lg:gap-6 space-y-6 lg:space-y-0">
        {/* Left Column: Batches Scheduled (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Batches Scheduled ({todayBatches.length})
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">
                {todayBatches.filter((b) => b.class_type === 'general').length} General •{' '}
                {todayBatches.filter((b) => b.class_type === 'demo').length} Demo
              </span>
            </div>

            <button
              id="add-batch-top-btn"
              onClick={() => {
                setEditingBatch(null);
                setIsBatchModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ ADD BATCH</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-10 text-center rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading daily batches...</p>
            </div>
          ) : todayBatches.length === 0 ? (
            <div
              id="empty-day-state"
              className="p-10 text-center rounded-lg bg-white border border-dashed border-slate-200 shadow-2xs space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl">
                ♟️
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No batches scheduled for this day
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Keep your chess teaching organized. Click below to schedule your first General or Demo batch.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setEditingBatch(null);
                    setIsBatchModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Batch</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  onEdit={(b) => {
                    setEditingBatch(b);
                    setIsBatchModalOpen(true);
                  }}
                  onDuplicate={handleDuplicateBatch}
                  onRequestDelete={(b) => {
                    setDeletingBatch(b);
                    setIsDeletePinModalOpen(true);
                  }}
                  onToggleType={handleToggleBatchType}
                />
              ))}
            </div>
          )}

          {/* Bottom [ + ADD BATCH ] Button */}
          {todayBatches.length > 0 && (
            <div className="pt-2">
              <button
                id="add-batch-main-btn"
                onClick={() => {
                  setEditingBatch(null);
                  setIsBatchModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-lg font-bold text-xs bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>+ ADD ANOTHER BATCH</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Daily Report & Quick Info (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 4. Live WhatsApp Daily Report Section (Requirement 5) */}
          <DailyReportSection
            currentDateStr={currentDateStr}
            batches={batches}
            theme={theme}
          />

          {/* Quick Assistant / Search Info */}
          <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-2xs space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Workspace Information
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every class change is saved instantly and reflected in your WhatsApp report. Demo classes (30 mins) count as 0.5 toward Grand Classes and are automatically omitted from daily reports.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Search All History</span>
              </button>
              <button
                onClick={() => setIsSupabaseSetupOpen(true)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Database Status</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Geometric Balance Status Footer */}
      <footer className="bg-slate-900 text-slate-400 py-3 px-6 border-t border-slate-800 text-[10px] font-medium tracking-wide mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                supabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span className="font-bold text-slate-300 uppercase">
              SYNC STATUS: {supabaseConnected ? 'ONLINE (SUPABASE POSTGRESQL)' : 'LOCAL PRIVATE MODE'}
            </span>
            <span className="text-slate-600">•</span>
            <span>SECURELY PROTECTED BY RLS</span>
          </div>
          <div>VERSION 1.0.4 • PIN PROTECTED ACTIONS</div>
        </div>
      </footer>

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Add / Edit Batch Modal */}
      <BatchModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setEditingBatch(null);
        }}
        onSave={handleSaveBatch}
        editingBatch={editingBatch}
        workDate={currentDateStr}
        theme={theme}
      />

      {/* Secure Delete Batch PIN Modal (Requires PIN: 0000, verified by backend) */}
      <DeletePinModal
        isOpen={isDeletePinModalOpen}
        batch={deletingBatch}
        onClose={() => {
          setIsDeletePinModalOpen(false);
          setDeletingBatch(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* History & Classes Search Modal */}
      <HistorySearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        batches={batches}
        onSelectDate={(date) => setCurrentDateStr(date)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={async (u) => {
          setUser(u);
          localStorage.setItem('chess_work_local_user', JSON.stringify(u));
          setIsLoading(true);
          const synced = await migrateLocalBatchesToCloud(u.id);
          setBatches(synced);
          setIsLoading(false);
          setStatusMessage('Signed in to Supabase & batches synced!');
          setTimeout(() => setStatusMessage(''), 3500);
        }}
        onOpenSupabaseSetup={() => setIsSupabaseSetupOpen(true)}
      />

      {/* Supabase PostgreSQL & RLS Setup Modal */}
      <SupabaseSetupModal
        isOpen={isSupabaseSetupOpen}
        onClose={() => setIsSupabaseSetupOpen(false)}
        onCredentialsUpdated={async () => {
          const configured = isSupabaseConfigured();
          setSupabaseConnected(configured);
          if (configured && user && user.id !== 'local_private_user') {
            setIsLoading(true);
            const synced = await migrateLocalBatchesToCloud(user.id);
            setBatches(synced);
            setIsLoading(false);
          } else {
            loadData();
          }
        }}
      />
    </div>
  );
}
