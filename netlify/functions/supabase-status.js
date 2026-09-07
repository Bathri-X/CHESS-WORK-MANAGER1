const { createClient } = require('@supabase/supabase-js');

exports.handler = async () => {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !anonKey) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configured: false,
        url: url || null,
        hasAnonKey: Boolean(anonKey),
        hasServiceKey: Boolean(serviceKey),
        connected: false,
        tableExists: false,
        message: 'Supabase URL or Anon Key is missing.',
      }),
    };
  }

  try {
    const client = createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: testError } = await client.from('batches').select('id').limit(1);

    if (testError) {
      const tableNotFound =
        testError.message.includes('relation') ||
        testError.message.includes('does not exist') ||
        testError.code === '42P01' ||
        testError.code === 'PGRST204';

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configured: true,
          url,
          hasAnonKey: Boolean(anonKey),
          hasServiceKey: Boolean(serviceKey),
          connected: true,
          tableExists: !tableNotFound,
          message: tableNotFound
            ? 'Connected to Supabase project, but "batches" table was not found. Please run the SQL schema.'
            : `Connected! RLS active: ${testError.message}`,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configured: true,
        url,
        hasAnonKey: Boolean(anonKey),
        hasServiceKey: Boolean(serviceKey),
        connected: true,
        tableExists: true,
        message: 'Supabase connected and batches table is ready.',
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configured: true,
        url,
        hasAnonKey: Boolean(anonKey),
        hasServiceKey: Boolean(serviceKey),
        connected: false,
        tableExists: false,
        message: `Connection error: ${err?.message || 'Failed to reach Supabase project.'}`,
      }),
    };
  }
};
