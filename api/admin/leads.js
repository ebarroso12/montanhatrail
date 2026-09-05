const db = require('../_lib/db');
const { requireAdmin } = require('../_lib/auth');

/** Protected: lists the most recent leads for the admin dashboard. */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  try {
    const result = await db.query(
      'SELECT id, name, email, phone, message, source, created_at FROM leads ORDER BY created_at DESC LIMIT 500'
    );

    res.status(200).json({ leads: result.rows || [] });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
