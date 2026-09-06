import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'chess_work_supabase_url';
const STORAGE_KEY_ANON_KEY = 'chess_work_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

/**
 * Validates if a string is a standard RFC4122 UUID
 */
export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Generates a standard RFC4122 v4 UUID with fallback if crypto.randomUUID is not available
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
  let cleaned = (rawUrl || '').trim();
  // Remove any trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function getCustomSupabaseCredentials(): { url: string; anonKey: string } {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    localStorage.getItem(STORAGE_KEY_URL) ||
    '';
  const anonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    localStorage.getItem(STORAGE_KEY_ANON_KEY) ||
    '';
  return { url: cleanSupabaseUrl(url), anonKey: anonKey.trim() };
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  const cleanUrl = cleanSupabaseUrl(url);
  const cleanKey = (anonKey || '').trim();

  if (cleanUrl) localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (cleanKey) localStorage.setItem(STORAGE_KEY_ANON_KEY, cleanKey);
  else localStorage.removeItem(STORAGE_KEY_ANON_KEY);

  cachedClient = null; // reset client
  cachedUrl = '';
  cachedKey = '';

  // Proactively inform backend server if running
  try {
    fetch('/api/supabase/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
    }).catch(() => {
      // Ignore if offline or API not available
    });
  } catch {
    // Ignore
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getCustomSupabaseCredentials();
  return Boolean(url && anonKey && (url.startsWith('https://') || url.startsWith('http://')));
}

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getCustomSupabaseCredentials();
  if (!url || !anonKey || (!url.startsWith('https://') && !url.startsWith('http://'))) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    cachedUrl = url;
    cachedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Tests connection to a Supabase project and checks if the 'batches' table exists.
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
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. Verify auth endpoint accessibility
    const { error: authError } = await client.auth.getSession();
    if (authError) {
      return {
        success: false,
        message: `Supabase Auth error: ${authError.message}`,
        tableExists: false,
      };
    }

    // 2. Query batches table to check if table exists and RLS is functional
    const { error: tableError } = await client.from('batches').select('id').limit(1);

    if (tableError) {
      // PostgREST 404 or relation does not exist
      if (
        tableError.message.includes('relation') ||
        tableError.message.includes('does not exist') ||
        tableError.code === '42P01' ||
        tableError.code === 'PGRST204'
      ) {
        return {
          success: true,
          tableExists: false,
          message: 'Connected to Supabase! However, the "batches" table does not exist yet. Please run the SQL schema in Step 1.',
        };
      }

      // If RLS blocked anon read, that still confirms table exists!
      return {
        success: true,
        tableExists: true,
        message: `Connected to Supabase! Batches table found (RLS policy active: ${tableError.message}).`,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: 'Connected to Supabase! Batches table exists and is ready for sync.',
    };
  } catch (err: any) {
    return {
      success: false,
      tableExists: false,
      message: `Connection failed: ${err?.message || 'Network error reaching Supabase.'}`,
    };
  }
}

