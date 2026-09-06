import React, { useState } from 'react';
import { X, Lock, Mail, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  onOpenSupabaseSetup: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onOpenSupabaseSetup,
}) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg(
        'Supabase is not configured yet. Please configure your Supabase URL & Anon Key or operate in Local Private Mode.'
      );
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user && data.session) {
          onAuthSuccess({ id: data.user.id, email: data.user.email || email.trim() });
          onClose();
        } else if (data.user && !data.session) {
          setErrorMsg(
            'Account created! Please check your email to verify your address, then log in (or turn off "Confirm email" in Supabase Dashboard > Authentication > Providers > Email for instant sign-ins).'
          );
          setIsSignUp(false); // Switch to login form
        } else {
          setErrorMsg('Sign up successful! Please check your email to confirm if required.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user) {
          onAuthSuccess({ id: data.user.id, email: data.user.email || email.trim() });
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsLocal = () => {
    // Allows private single-user offline experience
    onAuthSuccess({
      id: 'local_private_user',
      email: 'coach@chessmanager.private',
    });
    onClose();
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="auth-modal-container"
        className="w-full max-w-md rounded-lg bg-white border border-slate-200 p-6 shadow-2xl text-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">♟️</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isSignUp ? 'Create Private Account' : 'Private User Login'}
              </h3>
              <p className="text-xs text-slate-500">
                Supabase Authentication & Row Level Security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            id="auth-error-alert"
            className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {errorMsg.includes('Supabase is not configured') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseSetup();
                  }}
                  className="mt-1 text-blue-600 underline font-semibold cursor-pointer"
                >
                  Open Supabase Setup
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email-input"
                type="email"
                required
                placeholder="coach@yourchessclub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}</span>
          </button>

          <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
              }}
              className="hover:text-blue-600 underline cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Log in' : "Need an account? Sign up"}
            </button>

            <button
              type="button"
              onClick={handleContinueAsLocal}
              className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
            >
              Use Offline Mode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
