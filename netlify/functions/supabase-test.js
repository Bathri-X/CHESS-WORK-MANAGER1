const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

  const { url, anonKey, serviceKey } = body;
  const cleanUrl = typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';
  const cleanKey = typeof (serviceKey || anonKey) === 'string' ? (serviceKey || anonKey).trim() : '';

  if (!cleanUrl || !cleanKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Supabase URL and API Key are required for testing.' }),
    };
  }

  try {
    const client = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: authError } = await client.auth.getSession();
    if (authError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: `Supabase authentication error: ${authError.message}` }),
      };
    }

    const { error: tableError } = await client.from('batches').select('id').limit(1);

    if (tableError) {
      const tableNotFound =
        tableError.message.includes('relation') ||
        tableError.message.includes('does not exist') ||
        tableError.code === '42P01' ||
        tableError.code === 'PGRST204';

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          tableExists: !tableNotFound,
          message: tableNotFound
            ? 'Connected to Supabase project! Note: The "batches" table does not exist yet. Please execute the SQL schema.'
            : `Connected successfully! (Table protected by RLS: ${tableError.message})`,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        tableExists: true,
        message: 'Connected successfully! Batches table exists and is accessible.',
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: `Failed to connect: ${err?.message || 'Network error.'}` }),
    };
  }
};
