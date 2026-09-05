const db = require('../_lib/db');
const { parseCookies, clearSessionCookie, SESSION_COOKIE } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];

  if (token) {
    try {
      await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
    } catch (err) {
      // Even if this fails, still clear the cookie client-side below.
    }
  }

  clearSessionCookie(res);
  res.status(200).json({ ok: true });
};
