const bcrypt = require('bcryptjs');
const db = require('../../db');
const { parseBody } = require('../../body');
const { requireAdmin, parseCookies, SESSION_COOKIE } = require('../../auth');

// bcrypt only looks at the first 72 bytes of a password.
const MAX_PASSWORD_BYTES = 72;

/** Protected: changes the admin password and signs out every other session. */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const adminId = req.adminId || (await requireAdmin(req, res));
  if (!adminId) return;

  const body = parseBody(req);
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > MAX_PASSWORD_BYTES) {
    res.status(400).json({
      error: 'invalid_input',
      message: 'Informe a senha atual e uma nova senha com 8 a 72 caracteres.',
    });
    return;
  }
  if (newPassword === currentPassword) {
    res.status(400).json({ error: 'same_password', message: 'A nova senha precisa ser diferente da atual.' });
    return;
  }

  try {
    const adminResult = await db.query('SELECT id, password_hash FROM admin_users WHERE id = $1', [adminId]);
    const admin = adminResult.rows[0] || null;
    if (!admin) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const valid =
      Buffer.byteLength(currentPassword, 'utf8') <= MAX_PASSWORD_BYTES &&
      (await bcrypt.compare(currentPassword, admin.password_hash));
    if (!valid) {
      res.status(401).json({ error: 'invalid_current_password', message: 'Senha atual incorreta.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const currentToken = parseCookies(req)[SESSION_COOKIE] || '';
    await db.transaction(async (client) => {
      await client.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [newHash, adminId]);
      // Any other device (or a stolen session) is signed out; this one stays logged in.
      await client.query('DELETE FROM admin_sessions WHERE admin_id = $1 AND token <> $2', [adminId, currentToken]);
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin/change-password] erro:', err && err.message);
    res.status(500).json({ error: 'server_error' });
  }
};
