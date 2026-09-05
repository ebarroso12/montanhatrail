const bcrypt = require('bcryptjs');
const db = require('../_lib/db');
const { parseBody } = require('../_lib/body');
const { requireAdmin } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const body = parseBody(req);
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');

  if (!currentPassword || newPassword.length < 8) {
    res.status(400).json({
      error: 'invalid_input',
      message: 'Informe a senha atual e uma nova senha com pelo menos 8 caracteres.',
    });
    return;
  }

  try {
    const adminResult = await db.query(
      'SELECT id, password_hash FROM admin_users WHERE id = $1',
      [adminId]
    );
    const admin = adminResult.rows[0] || null;

    if (!admin) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'invalid_current_password', message: 'Senha atual incorreta.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [newHash, adminId]);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
