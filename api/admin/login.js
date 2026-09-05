const bcrypt = require('bcryptjs');
const { getSupabase } = require('../_lib/supabase');
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
    const supabase = getSupabase();

    // Brute-force guard: block after too many recent failed attempts for
    // this e-mail, regardless of which password is being tried.
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .eq('success', false)
      .gte('created_at', windowStart);

    if ((count || 0) >= MAX_FAILED_ATTEMPTS) {
      res.status(429).json({
        error: 'too_many_attempts',
        message: `Muitas tentativas de login. Tente novamente em ${LOCKOUT_WINDOW_MINUTES} minutos.`,
      });
      return;
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, password_hash')
      .eq('email', email)
      .maybeSingle();

    const valid = admin ? await bcrypt.compare(password, admin.password_hash) : false;

    await supabase.from('login_attempts').insert({ email, ip, success: valid });

    if (!valid) {
      res.status(401).json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
      return;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await supabase.from('admin_sessions').insert({ token, admin_id: admin.id, expires_at: expiresAt });

    setSessionCookie(res, token, SESSION_TTL_HOURS * 60 * 60);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'Erro ao autenticar. Tente novamente.' });
  }
};
