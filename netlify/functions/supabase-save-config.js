// On Netlify, credentials are set via Netlify Environment Variables (not writable at runtime).
// This endpoint acknowledges the save attempt and tells the client to use env vars.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // On Netlify, runtime env vars can't be written to disk.
  // The frontend saves to localStorage directly — this endpoint just confirms receipt.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      message: 'Configuration acknowledged. On Netlify, set credentials via Netlify Dashboard > Environment Variables for server-side use.',
    }),
  };
};
