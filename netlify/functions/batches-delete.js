const { createClient } = require('@supabase/supabase-js');

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

  const { id, pin, userId } = body;
  const configuredPin = (process.env.DELETE_PIN || '0000').trim();

  // Strict backend PIN verification
  if (typeof pin !== 'string' || pin.trim() !== configuredPin) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Wrong credentials. Batch was not deleted.' }),
    };
  }

  if (!id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Batch ID is required.' }),
    };
  }

  try {
    const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

    if (url && serviceKey) {
      const supabaseAdmin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      let query = supabaseAdmin.from('batches').delete().eq('id', id);
      if (isValidUuid(userId)) {
        query = query.eq('user_id', userId.trim());
      }

      const { error } = await query;
      if (error) {
        console.error('Supabase server delete error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: `Database delete failed: ${error.message}` }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Batch successfully deleted.', id }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err?.message || 'Internal server error while deleting batch.' }),
    };
  }
};
