exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

  const { pin } = body;
  const configuredPin = (process.env.DELETE_PIN || '0000').trim();

  if (typeof pin !== 'string' || pin.trim() !== configuredPin) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Wrong credentials. Batch was not deleted.' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, message: 'PIN verified successfully.' }),
  };
};
