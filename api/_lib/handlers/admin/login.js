const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const { parseBody } = require('../../body');
const {
  setSessionCookie,
  generateToken,
  SESSION_TTL_HOURS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_WINDOW_MINUTES,
  getClientIp,
} = require('../../auth');

// Brute-force limits inside LOCKOUT_WINDOW_MINUTES:
// - per e-mail + IP: low, so one attacker is stopped quickly;
// - per e-mail across all IPs: high, so someone who knows the admin e-mail
//   can't lock the real admin out just by failing on purpose from one place.
const MAX_FAILED_PER_EMAIL = 30;

// bcrypt only looks at the first 72 bytes of a password.
const MAX_PASSWORD_BYTES = 72;

// Compared when the e-mail doesn't exist, so the response takes as long as a
// wrong password for a real account (no user enumeration by timing).
let dummyHash = null;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 12);
  return dummyHash;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const ip = getClientIp(req);

  if (!email || !password) {
    res.status(400).json({ error: 'missing_fields', message: 'Informe e-mail e senha.' });
    return;
  }
  if (email.length > 254 || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    res.status(401).json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
    return;
  }

  try {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();

    const outcome = await db.transaction(async (client) => {
      // One attempt at a time per e-mail: parallel requests can't all pass the count.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`admin-login:${email}`]);

      const counts = await client.query(
        `SELECT count(*) FILTER (WHERE ip = $2)::int AS by_ip, count(*)::int AS total
         FROM login_attempts
         WHERE email = $1 AND success = false AND created_at >= $3`,
        [email, ip, windowStart]
      );
      const { by_ip: byIp, total } = counts.rows[0];
      if (byIp >= MAX_FAILED_ATTEMPTS || total >= MAX_FAILED_PER_EMAIL) return { locked: true };

      const adminResult = await client.query('SELECT id, password_hash FROM admin_users WHERE email = $1', [email]);
      const admin = adminResult.rows[0] || null;
      const matches = await bcrypt.compare(password, admin ? admin.password_hash : getDummyHash());
      const valid = !!admin && matches;

      await client.query('INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)', [email, ip, valid]);
      if (!valid) return { valid: false };

      const token = generateToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
      await client.query('INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES ($1, $2, $3)', [token, admin.id, expiresAt]);

      // Housekeeping: expired sessions and old attempts don't need to be kept.
      await client.query('DELETE FROM admin_sessions WHERE expires_at < now()');
      await client.query("DELETE FROM login_attempts WHERE created_at < now() - interval '30 days'");

      return { valid: true, token };
    });

    if (outcome.locked) {
      res.status(429).json({
        error: 'too_many_attempts',
        message: `Muitas tentativas de login. Tente novamente em ${LOCKOUT_WINDOW_MINUTES} minutos.`,
      });
      return;
    }
    if (!outcome.valid) {
      res.status(401).json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
      return;
    }

    setSessionCookie(res, outcome.token, SESSION_TTL_HOURS * 60 * 60);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/login] erro:', err && err.message);
    res.status(500).json({ error: 'server_error', message: 'Erro ao autenticar. Tente novamente.' });
  }
};
