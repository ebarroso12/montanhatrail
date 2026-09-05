const bcrypt = require('bcryptjs');
const db = require('../_lib/db');
const { parseBody } = require('../_lib/body');
const {
  setSessionCookie,
  generateToken,
  SESSION_TTL_HOURS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_WINDOW_MINUTES,
  getClientIp,
} = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const ip = getClientIp(req);

  if (!email || !password) {
    res.status(400).json({ error: 'missing_fields', message: 'Informe e-mail e senha.' });
    return;
  }

  try {
    // Brute-force guard: block after too many recent failed attempts for
    // this e-mail, regardless of which password is being tried.
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const countResult = await db.query(
      'SELECT COUNT(*)::int AS count FROM login_attempts WHERE email = $1 AND success = false AND created_at >= $2',
      [email, windowStart]
    );
    const count = countResult.rows[0] ? countResult.rows[0].count : 0;

    if (count >= MAX_FAILED_ATTEMPTS) {
      res.status(429).json({
        error: 'too_many_attempts',
        message: `Muitas tentativas de login. Tente novamente em ${LOCKOUT_WINDOW_MINUTES} minutos.`,
      });
      return;
    }

    const adminResult = await db.query(
      'SELECT id, password_hash FROM admin_users WHERE email = $1',
      [email]
    );
    const admin = adminResult.rows[0] || null;

    const valid = admin ? await bcrypt.compare(password, admin.password_hash) : false;

    await db.query(
      'INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)',
      [email, ip, valid]
    );

    if (!valid) {
      res.status(401).json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
      return;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await db.query(
      'INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES ($1, $2, $3)',
      [token, admin.id, expiresAt]
    );

    setSessionCookie(res, token, SESSION_TTL_HOURS * 60 * 60);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/login] erro:', err);
    res.status(500).json({ error: 'server_error', message: 'Erro ao autenticar. Tente novamente.' });
  }
};
