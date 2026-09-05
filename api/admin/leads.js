const { getSupabase } = require('../_lib/supabase');
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
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, email, phone, message, source, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    res.status(200).json({ leads: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
