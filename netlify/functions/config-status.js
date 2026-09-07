exports.handler = async () => {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supabaseConfigured: Boolean(url && anonKey),
      hasServiceKey: Boolean(serviceKey),
      hasServerPinConfigured: Boolean(process.env.DELETE_PIN),
      url: url || '',
    }),
  };
};
