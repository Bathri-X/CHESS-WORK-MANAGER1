import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'chess_work_supabase_url';
const STORAGE_KEY_ANON_KEY = 'chess_work_supabase_anon_key';

// Module-level singleton — only one GoTrueClient ever exists at a time
let _client: SupabaseClient | null = null;
let _clientUrl = '';
let _clientKey = '';

/**
 * Validates if a string is a standard RFC4122 UUID
 */
export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Generates a standard RFC4122 v4 UUID with fallback
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback below
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Clean and format Supabase project URL
 */
export function cleanSupabaseUrl(rawUrl: string): string {
  return (rawUrl || '').trim().replace(/\/+$/, '');
}

/**
 * Get credentials — localStorage takes priority over env vars so
 * the in-app Setup modal can override the defaults at runtime.
 */
export function getCustomSupabaseCredentials(): { url: string; anonKey: string } {
  // localStorage overrides env vars (allows in-app credential update without restart)
  const url =
    localStorage.getItem(STORAGE_KEY_URL) ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    '';
  const anonKey =
    localStorage.getItem(STORAGE_KEY_ANON_KEY) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    '';
  return { url: cleanSupabaseUrl(url), anonKey: anonKey.trim() };
}

/**
 * Persist credentials to localStorage and reset the singleton client
 */
export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  const cleanUrl = cleanSupabaseUrl(url);
  const cleanKey = (anonKey || '').trim();

  if (cleanUrl) localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (cleanKey) localStorage.setItem(STORAGE_KEY_ANON_KEY, cleanKey);
  else localStorage.removeItem(STORAGE_KEY_ANON_KEY);

  // Destroy the singleton so next getSupabase() call creates a fresh client
  if (_client) {
    try { _client.auth.stopAutoRefresh(); } catch { /* ignore */ }
  }
  _client = null;
  _clientUrl = '';
  _clientKey = '';

  // Also inform the backend server
  try {
    fetch('/api/supabase/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
    }).catch(() => {/* Ignore if offline */});
  } catch {
    // Ignore
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getCustomSupabaseCredentials();
  return Boolean(url && anonKey && (url.startsWith('https://') || url.startsWith('http://')));
}

/**
 * Returns the singleton Supabase client. Creates it only if credentials
 * changed or it doesn't exist yet — prevents multiple GoTrueClient instances.
 */
export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getCustomSupabaseCredentials();
  if (!url || !anonKey || (!url.startsWith('https://') && !url.startsWith('http://'))) {
    return null;
  }

  // Return cached client if credentials haven't changed
  if (_client && _clientUrl === url && _clientKey === anonKey) {
    return _client;
  }

  // Tear down old client before creating new one
  if (_client) {
    try { _client.auth.stopAutoRefresh(); } catch { /* ignore */ }
    _client = null;
  }

  try {
    _client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Use a unique storageKey per project URL to avoid collisions
        storageKey: `chess_sb_auth_${url.replace(/[^a-z0-9]/gi, '_')}`,
      },
    });
    _clientUrl = url;
    _clientKey = anonKey;
    return _client;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Tests connection via the backend API (/api/supabase/test) to avoid
 * creating a competing GoTrueClient in the browser.
 */
export async function testSupabaseConnection(
  testUrl?: string,
  testAnonKey?: string
): Promise<{ success: boolean; message: string; tableExists: boolean }> {
  const creds = getCustomSupabaseCredentials();
  const url = cleanSupabaseUrl(testUrl !== undefined ? testUrl : creds.url);
  const anonKey = (testAnonKey !== undefined ? testAnonKey : creds.anonKey).trim();

  if (!url) {
    return { success: false, message: 'Please provide your Supabase Project URL.', tableExists: false };
  }
  if (!anonKey) {
    return { success: false, message: 'Please provide your Supabase Public Anon Key.', tableExists: false };
  }
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return {
      success: false,
      message: 'Project URL must start with https:// (e.g. https://xyzcompany.supabase.co)',
      tableExists: false,
    };
  }

  try {
    // Proxy through backend to avoid a second GoTrueClient instance
    const res = await fetch('/api/supabase/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, anonKey }),
    });

    const data = await res.json();
    return {
      success: data.success ?? false,
      message: data.message ?? 'Unknown response from server.',
      tableExists: data.tableExists ?? false,
    };
  } catch (err: any) {
    return {
      success: false,
      tableExists: false,
      message: `Connection failed: ${err?.message || 'Network error reaching backend.'}`,
    };
  }
}
