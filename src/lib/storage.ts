import { Batch, TrackingPeriod, TrackingStats } from '../types';
import { getSupabase, isValidUuid, generateUuid } from './supabase';
import { parseISODate } from './dateUtils';

const LOCAL_BATCHES_KEY = 'chess_work_local_batches';
export const TRACKING_PREFERENCE_KEY = 'chess_work_tracking_view_pref';

// Per-user migration flag — ensures cloud migration runs EXACTLY ONCE per account
const getMigrationFlagKey = (userId: string) => `chess_work_migrated_${userId}`;

function hasMigratedToCloud(userId: string): boolean {
  return localStorage.getItem(getMigrationFlagKey(userId)) === 'true';
}

function markMigratedToCloud(userId: string): void {
  localStorage.setItem(getMigrationFlagKey(userId), 'true');
}


/**
 * Get stored tracking period preference (defaults to 'MONTHLY')
 */
export function getSavedTrackingPeriod(): TrackingPeriod {
  const saved = localStorage.getItem(TRACKING_PREFERENCE_KEY);
  if (saved === 'MONTHLY' || saved === 'YEARLY' || saved === 'SO_FAR') {
    return saved as TrackingPeriod;
  }
  return 'MONTHLY';
}

/**
 * Save tracking period preference
 */
export function saveTrackingPeriod(period: TrackingPeriod): void {
  localStorage.setItem(TRACKING_PREFERENCE_KEY, period);
}

/**
 * Read cached batches from localStorage
 */
export function getLocalCachedBatches(): Batch[] {
  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('Failed to parse local batches:', err);
    return [];
  }
}

/**
 * Save batches array to local cache
 */
export function setLocalCachedBatches(batches: Batch[]): void {
  try {
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(batches));
  } catch (err) {
    console.error('Failed to write local batches:', err);
  }
}

/**
 * Fetch all batches for the authenticated user
 */
export async function fetchAllBatches(userId?: string): Promise<Batch[]> {
  const supabase = getSupabase();
  const cached = getLocalCachedBatches();

  // Only query Supabase if configured and userId is a valid UUID (authenticated user)
  if (!supabase || !userId || !isValidUuid(userId)) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('user_id', userId)
      .order('work_date', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error, using local cached data:', error.message);
      return cached;
    }

    if (data) {
      const formatted: Batch[] = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        work_date: item.work_date,
        start_time: item.start_time,
        end_time: item.end_time,
        class_name: item.class_name,
        topic: item.topic,
        homework: item.homework || '',
        class_type: item.class_type as 'general' | 'demo',
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      setLocalCachedBatches(formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('Network error while fetching from Supabase, using local cached:', err);
  }

  return cached;
}

/**
 * Upsert a batch online and update local cache.
 * Ensures the batch has a valid UUID primary key.
 */
export async function upsertBatch(batch: Batch, userId: string): Promise<Batch> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  // Ensure batch has a valid RFC4122 UUID
  const batchId = isValidUuid(batch.id) ? batch.id : generateUuid();

  const finalBatch: Batch = {
    ...batch,
    id: batchId,
    user_id: userId,
    updated_at: nowIso,
    created_at: batch.created_at || nowIso,
  };

  // Update local cache immediately (optimistic update)
  const localBatches = getLocalCachedBatches();
  const index = localBatches.findIndex((b) => b.id === finalBatch.id || b.id === batch.id);
  if (index >= 0) {
    localBatches[index] = finalBatch;
  } else {
    localBatches.push(finalBatch);
  }
  setLocalCachedBatches(localBatches);

  // Sync to Supabase only if configured AND user is a real authenticated UUID
  if (!supabase) {
    console.info('[Supabase] Not configured — batch saved locally only.');
    return finalBatch;
  }
  if (!isValidUuid(userId)) {
    console.warn(
      '[Supabase] Skipping cloud sync — user is not authenticated. ' +
      'Sign in via the Login button to sync batches to Supabase.'
    );
    return finalBatch;
  }

  try {
    const { error } = await supabase.from('batches').upsert(
      {
        id: finalBatch.id,
        user_id: finalBatch.user_id,
        work_date: finalBatch.work_date,
        start_time: finalBatch.start_time,
        end_time: finalBatch.end_time,
        class_name: finalBatch.class_name,
        topic: finalBatch.topic,
        homework: finalBatch.homework || '',
        class_type: finalBatch.class_type,
        created_at: finalBatch.created_at,
        updated_at: finalBatch.updated_at,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('[Supabase] Upsert error:', error.message, error.code);
    } else {
      console.info('[Supabase] Batch synced successfully:', finalBatch.id);
    }
  } catch (err: any) {
    console.warn('[Supabase] Sync warning (data saved locally):', err?.message);
  }

  return finalBatch;
}

/**
 * Migrates local batches to Supabase when a user signs in.
 */
export async function migrateLocalBatchesToCloud(authUserId: string): Promise<Batch[]> {
  if (!isValidUuid(authUserId)) return getLocalCachedBatches();
  const supabase = getSupabase();
  if (!supabase) return getLocalCachedBatches();

  // GUARD: only migrate once per user account to prevent duplicates on re-login/refresh
  if (hasMigratedToCloud(authUserId)) {
    console.info('[Supabase] Migration already done for this user, fetching cloud data.');
    const cloudBatches = await fetchAllBatches(authUserId);
    // Always replace local cache with authoritative cloud data
    setLocalCachedBatches(cloudBatches);
    return cloudBatches;
  }

  try {
    const localBatches = getLocalCachedBatches();

    // Only migrate batches that were created locally (not already cloud-synced rows)
    // Filter out any batch already owned by a real UUID user (already synced)
    const toUpload = localBatches
      .filter((b) => !isValidUuid(b.user_id) || b.user_id === authUserId)
      .filter((b) => b.class_name && b.work_date && b.start_time) // must have required fields
      .map((b) => ({
        id: isValidUuid(b.id) ? b.id : generateUuid(),
        user_id: authUserId,
        work_date: b.work_date,
        start_time: b.start_time,
        end_time: b.end_time,
        class_name: b.class_name,
        topic: b.topic,
        homework: b.homework || '',
        class_type: b.class_type,
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      }));

    if (toUpload.length > 0) {
      const { error: upsertError } = await supabase
        .from('batches')
        .upsert(toUpload, { onConflict: 'id' });
      if (upsertError) {
        console.error('[Supabase] Migration upsert error:', upsertError.message);
      } else {
        console.info(`[Supabase] Migrated ${toUpload.length} local batches to cloud.`);
      }
    }

    // Mark migration as done so it NEVER runs again for this user
    markMigratedToCloud(authUserId);

    // Fetch the authoritative cloud state and replace local cache
    const cloudBatches = await fetchAllBatches(authUserId);
    setLocalCachedBatches(cloudBatches);
    return cloudBatches;
  } catch (err) {
    console.warn('[Supabase] Error during batch cloud migration:', err);
    return getLocalCachedBatches();
  }
}

/**
 * Deletes a batch securely by verifying the PIN on the backend!
 * Throws exact backend error if PIN is incorrect: "Wrong credentials. Batch was not deleted."
 */
export async function deleteBatchWithPin(
  batchId: string,
  pin: string,
  userId?: string
): Promise<void> {
  const safeUserId = isValidUuid(userId) ? userId : undefined;

  const response = await fetch('/api/batches/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: batchId,
      pin: pin.trim(),
      userId: safeUserId,
    }),
  });

  const result = await response.json().catch(() => ({
    success: false,
    error: 'Network error communicating with deletion service.',
  }));

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Wrong credentials. Batch was not deleted.');
  }

  // Deletion confirmed by server; also delete from Supabase client directly if active session
  const supabase = getSupabase();
  if (supabase && safeUserId) {
    try {
      await supabase.from('batches').delete().eq('id', batchId).eq('user_id', safeUserId);
    } catch (err) {
      console.warn('Supabase client delete failed after server approval:', err);
    }
  }

  // Remove from local cache
  const localBatches = getLocalCachedBatches();
  const updated = localBatches.filter((b) => b.id !== batchId);
  setLocalCachedBatches(updated);
}

/**
 * Calculates Grand, General, and Demo class counts for the selected period
 */
export function calculateTrackingStats(
  batches: Batch[],
  period: TrackingPeriod,
  referenceDateStr: string
): TrackingStats {
  const refDate = parseISODate(referenceDateStr);
  const targetYear = refDate.getFullYear();
  const targetMonth = refDate.getMonth(); // 0-indexed

  let filteredBatches = batches;

  if (period === 'MONTHLY') {
    filteredBatches = batches.filter((b) => {
      const bDate = parseISODate(b.work_date);
      return bDate.getFullYear() === targetYear && bDate.getMonth() === targetMonth;
    });
  } else if (period === 'YEARLY') {
    filteredBatches = batches.filter((b) => {
      const bDate = parseISODate(b.work_date);
      return bDate.getFullYear() === targetYear;
    });
  }
  // For 'SO_FAR', we include all batches

  let general = 0;
  let demo = 0;

  for (const b of filteredBatches) {
    if (b.class_type === 'demo') {
      demo += 1;
    } else {
      general += 1;
    }
  }

  // Grand = G + (D / 2)
  const grand = general + demo * 0.5;

  return {
    grand,
    general,
    demo,
  };
}
