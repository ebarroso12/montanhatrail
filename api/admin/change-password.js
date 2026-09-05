const bcrypt = require('bcryptjs');
const { getSupabase } = require('../_lib/supabase');
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
    const supabase = getSupabase();
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, password_hash')
      .eq('id', adminId)
      .maybeSingle();

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
    await supabase.from('admin_users').update({ password_hash: newHash }).eq('id', adminId);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
