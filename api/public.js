const { CACHE, isSameOrigin } = require('./_lib/http');

/**
 * Public write endpoints used by the storefront (vercel.json rewrites
 * /api/leads and /api/track-click here). Grouped in one function to keep the
 * deployment's function count low.
 */
const ROUTES = {
  leads: require('./_lib/handlers/leads'),
  'track-click': require('./_lib/handlers/track-click'),
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', CACHE.private);

  const route = String(req.query.route || '');
  if (!Object.prototype.hasOwnProperty.call(ROUTES, route)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (req.method !== 'GET' && !isSameOrigin(req)) {
    res.status(403).json({ error: 'forbidden_origin' });
    return;
  }

  try {
    await ROUTES[route](req, res);
  } catch (err) {
    console.error('[public] erro:', err);
    if (!res.headersSent) res.status(500).json({ error: 'server_error' });
  }
};
