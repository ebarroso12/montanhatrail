const { requireAdmin } = require('./_lib/auth');
const { CACHE, isSameOrigin, isJsonRequest } = require('./_lib/http');
const { ValidationError } = require('./_lib/validate');

/**
 * Single function behind every /api/admin/* URL (vercel.json rewrites
 * /api/admin/:route → /api/admin?route=:route). Keeping all admin endpoints
 * in one function stays well under the per-deployment function limit, and
 * puts the auth + CSRF checks in exactly one place.
 */

const OPEN_ROUTES = {
  login: require('./_lib/handlers/admin/login'),
  logout: require('./_lib/handlers/admin/logout'),
  session: require('./_lib/handlers/admin/session'),
};

const PROTECTED_ROUTES = {
  stats: require('./_lib/handlers/admin/stats'),
  products: require('./_lib/handlers/admin/products'),
  categories: require('./_lib/handlers/admin/categories'),
  upload: require('./_lib/handlers/admin/upload'),
  leads: require('./_lib/handlers/admin/leads'),
  clicks: require('./_lib/handlers/admin/clicks'),
  content: require('./_lib/handlers/admin/content'),
  'change-password': require('./_lib/handlers/admin/change-password'),
};

function sendError(res, err) {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: 'validation', field: err.field, message: err.message });
    return;
  }
  if (err && err.code === '23505') {
    res.status(409).json({ error: 'duplicate', field: 'slug', message: 'Já existe um item com este slug. Escolha outro.' });
    return;
  }
  if (err && err.code === '23503') {
    const inUse = /still referenced/i.test(err.detail || '');
    res.status(409).json({
      error: inUse ? 'in_use' : 'invalid_reference',
      message: inUse
        ? 'Este item está em uso e não pode ser excluído.'
        : 'Categoria não encontrada. Recarregue a página e tente novamente.',
    });
    return;
  }
  if (err && err.code === '23514') {
    res.status(400).json({ error: 'validation', message: 'Dados inválidos. Revise os campos e tente novamente.' });
    return;
  }
  console.error('[admin] erro:', err);
  res.status(500).json({ error: 'server_error', message: 'Erro inesperado. Tente novamente.' });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', CACHE.private);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const route = String(req.query.route || '');
  const isOpen = Object.prototype.hasOwnProperty.call(OPEN_ROUTES, route);
  const isProtected = Object.prototype.hasOwnProperty.call(PROTECTED_ROUTES, route);
  if (!isOpen && !isProtected) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!isSameOrigin(req)) {
      res.status(403).json({ error: 'forbidden_origin' });
      return;
    }
    if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && !isJsonRequest(req)) {
      res.status(415).json({ error: 'unsupported_media_type' });
      return;
    }
  }

  if (isProtected) {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    req.adminId = adminId;
  }

  try {
    await (isOpen ? OPEN_ROUTES[route] : PROTECTED_ROUTES[route])(req, res);
  } catch (err) {
    if (!res.headersSent) sendError(res, err);
  }
};
