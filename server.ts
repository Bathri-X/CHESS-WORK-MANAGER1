import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to check valid UUID
function isValidUuid(id?: any): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

let cachedAdminClient: any = null;

// Lazy Supabase Admin Client for server operations if credentials exist
function getSupabaseAdmin() {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return null;
  try {
    cachedAdminClient = createClient(url.trim().replace(/\/+$/, ''), serviceKey.trim());
    return cachedAdminClient;
  } catch (err) {
    console.error('Failed to create server Supabase client:', err);
    return null;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Environment config status endpoint (never exposes secrets)
app.get('/api/config-status', (req, res) => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  res.json({
    supabaseConfigured: Boolean(url && anonKey),
    hasServiceKey: Boolean(serviceKey),
    hasServerPinConfigured: Boolean(process.env.DELETE_PIN),
    url: url ? url.trim().replace(/\/+$/, '') : '',
  });
});

// Detailed Supabase diagnostic status endpoint
app.get('/api/supabase/status', async (req, res) => {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !anonKey) {
    return res.json({
      configured: false,
      url: url || null,
      hasAnonKey: Boolean(anonKey),
      hasServiceKey: Boolean(serviceKey),
      connected: false,
      tableExists: false,
      message: 'Supabase URL or Anon Key is missing.',
    });
  }

  try {
    const client = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: testError } = await client.from('batches').select('id').limit(1);

    if (testError) {
      if (
        testError.message.includes('relation') ||
        testError.message.includes('does not exist') ||
        testError.code === '42P01' ||
        testError.code === 'PGRST204'
      ) {
        return res.json({
          configured: true,
          url,
          hasAnonKey: Boolean(anonKey),
          hasServiceKey: Boolean(serviceKey),
          connected: true,
          tableExists: false,
          message: 'Connected to Supabase project, but "batches" table was not found. Please run the SQL schema.',
        });
      }

      return res.json({
        configured: true,
        url,
        hasAnonKey: Boolean(anonKey),
        hasServiceKey: Boolean(serviceKey),
        connected: true,
        tableExists: true,
        message: `Connected! RLS active: ${testError.message}`,
      });
    }

    return res.json({
      configured: true,
      url,
      hasAnonKey: Boolean(anonKey),
      hasServiceKey: Boolean(serviceKey),
      connected: true,
      tableExists: true,
      message: 'Supabase connected and batches table is ready.',
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      url,
      hasAnonKey: Boolean(anonKey),
      hasServiceKey: Boolean(serviceKey),
      connected: false,
      tableExists: false,
      message: `Connection error: ${err?.message || 'Failed to reach Supabase project.'}`,
    });
  }
});

// Test connection endpoint for test credentials before saving
app.post('/api/supabase/test', async (req, res) => {
  const { url, anonKey, serviceKey } = req.body;
  const cleanUrl = typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';
  const cleanKey = typeof (serviceKey || anonKey) === 'string' ? (serviceKey || anonKey).trim() : '';

  if (!cleanUrl || !cleanKey) {
    return res.status(400).json({
      success: false,
      message: 'Supabase URL and API Key are required for testing.',
    });
  }

  try {
    const client = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: authError } = await client.auth.getSession();
    if (authError) {
      return res.status(400).json({
        success: false,
        message: `Supabase authentication error: ${authError.message}`,
      });
    }

    const { error: tableError } = await client.from('batches').select('id').limit(1);

    if (tableError) {
      if (
        tableError.message.includes('relation') ||
        tableError.message.includes('does not exist') ||
        tableError.code === '42P01' ||
        tableError.code === 'PGRST204'
      ) {
        return res.json({
          success: true,
          tableExists: false,
          message: 'Connected to Supabase project! Note: The "batches" table does not exist yet. Please execute the SQL schema in Supabase SQL editor.',
        });
      }

      return res.json({
        success: true,
        tableExists: true,
        message: `Connected successfully! (Table protected by RLS: ${tableError.message})`,
      });
    }

    return res.json({
      success: true,
      tableExists: true,
      message: 'Connected successfully! Batches table exists and is accessible.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Failed to connect: ${err?.message || 'Network error.'}`,
    });
  }
});

// Endpoint to save Supabase credentials and update runtime environment
app.post('/api/supabase/save-config', (req, res) => {
  const { url, anonKey, serviceKey } = req.body;
  const cleanUrl = typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';
  const cleanAnon = typeof anonKey === 'string' ? anonKey.trim() : '';
  const cleanService = typeof serviceKey === 'string' ? serviceKey.trim() : '';

  if (cleanUrl) process.env.VITE_SUPABASE_URL = cleanUrl;
  if (cleanAnon) process.env.VITE_SUPABASE_ANON_KEY = cleanAnon;
  if (cleanService) process.env.SUPABASE_SERVICE_ROLE_KEY = cleanService;

  cachedAdminClient = null; // Clear cached client

  // Update .env file on disk if accessible
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const updateOrAppend = (key: string, val: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${val}"`);
      } else {
        envContent += `\n${key}="${val}"`;
      }
    };

    if (cleanUrl) updateOrAppend('VITE_SUPABASE_URL', cleanUrl);
    if (cleanAnon) updateOrAppend('VITE_SUPABASE_ANON_KEY', cleanAnon);
    if (cleanService) updateOrAppend('SUPABASE_SERVICE_ROLE_KEY', cleanService);

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
  } catch (err) {
    console.warn('Could not write to .env file on disk:', err);
  }

  return res.json({
    success: true,
    message: 'Supabase configuration saved successfully.',
  });
});

// Secure PIN verification endpoint
// NOTE: PIN is NEVER checked or hardcoded on the client-side
app.post('/api/verify-delete-pin', (req, res) => {
  const { pin } = req.body;
  const configuredPin = (process.env.DELETE_PIN || '0000').trim();

  if (typeof pin !== 'string' || pin.trim() !== configuredPin) {
    return res.status(403).json({
      success: false,
      error: 'Wrong credentials. Batch was not deleted.',
    });
  }

  return res.json({
    success: true,
    message: 'PIN verified successfully.',
  });
});

// Secure Batch Deletion endpoint
app.post('/api/batches/delete', async (req, res) => {
  const { id, pin, userId } = req.body;
  const configuredPin = (process.env.DELETE_PIN || '0000').trim();

  // Strict backend verification of deletion PIN
  if (typeof pin !== 'string' || pin.trim() !== configuredPin) {
    return res.status(403).json({
      success: false,
      error: 'Wrong credentials. Batch was not deleted.',
    });
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Batch ID is required.',
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      let query = supabaseAdmin.from('batches').delete().eq('id', id);
      // ONLY filter by user_id if it is a valid UUID to avoid Postgres syntax crash
      if (isValidUuid(userId)) {
        query = query.eq('user_id', userId.trim());
      }
      const { error } = await query;
      if (error) {
        console.error('Supabase server delete error:', error);
        return res.status(500).json({
          success: false,
          error: `Database delete failed: ${error.message}`,
        });
      }
    }

    return res.json({
      success: true,
      message: 'Batch successfully deleted.',
      id,
    });
  } catch (err: any) {
    console.error('Error during batch deletion:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while deleting batch.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`♟️ Chess Work Manager server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
