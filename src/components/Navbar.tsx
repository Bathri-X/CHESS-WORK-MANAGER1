import React from 'react';
import { Database, LogIn, LogOut, User as UserIcon, Calendar, Sparkles } from 'lucide-react';
import { WeekdayThemeConfig, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  theme: WeekdayThemeConfig;
  user: UserProfile | null;
  supabaseConnected: boolean;
  onOpenAuth: () => void;
  onOpenSupabaseSetup: () => void;
  onSignOut: () => void;
  onGoToToday: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  user,
  supabaseConnected,
  onOpenAuth,
  onOpenSupabaseSetup,
  onSignOut,
  onGoToToday,
}) => {
  return (
    <header
      id="app-navbar"
      className="w-full border-b border-slate-800/90 bg-slate-950 text-slate-200 transition-colors shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
        {/* Brand & Theme badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToToday}
            className="flex items-center gap-2 text-left group cursor-pointer"
            title="Go to Today"
          >
            <span className="text-xl">♟️</span>
            <span className="font-extrabold tracking-wider text-white uppercase text-xs sm:text-sm">
              CHESS WORK MANAGER
            </span>
          </button>
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: theme.accentColor }}
            />
            <span>{theme.name} Theme ({theme.colorName})</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Supabase Schema & Connection Status Button */}
          <button
            id="supabase-setup-btn"
            onClick={onOpenSupabaseSetup}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors cursor-pointer ${
              supabaseConnected
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
            title="Supabase Database & RLS Settings"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {supabaseConnected ? 'Supabase Sync' : 'DB Setup'}
            </span>
          </button>

          {/* User Account Button */}
          {user && user.id !== 'local_private_user' ? (
            <div className="flex items-center gap-1.5">
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300"
                title={`Signed in as ${user.email} (Cloud Sync Active)`}
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[130px] truncate font-medium">{user.email}</span>
              </div>
              <button
                id="sign-out-btn"
                onClick={onSignOut}
                className="p-1.5 rounded border border-slate-800 bg-slate-900 hover:bg-red-950/40 hover:border-red-800/50 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                title="Sign Out to Local Mode"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="login-btn"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-xs"
              title="Sign In with Supabase to enable multi-device sync"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Sync</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
