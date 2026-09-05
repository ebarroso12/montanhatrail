const db = require('../_lib/db');
const { requireAdmin } = require('../_lib/auth');

/** Protected: aggregates click counts per CTA label for the admin dashboard. */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  try {
    const result = await db.query(
      'SELECT label, created_at FROM clicks ORDER BY created_at DESC LIMIT 10000'
    );
    const data = result.rows || [];

    const totals = {};
    const last7days = {};
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    data.forEach((row) => {
      totals[row.label] = (totals[row.label] || 0) + 1;
      if (now - new Date(row.created_at).getTime() <= sevenDaysMs) {
        last7days[row.label] = (last7days[row.label] || 0) + 1;
      }
    });

    res.status(200).json({ totals, last7days, totalClicks: data.length });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
