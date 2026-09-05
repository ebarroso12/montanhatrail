const db = require('../_lib/db');
const { parseBody } = require('../_lib/body');
const { requireAdmin } = require('../_lib/auth');

// Fixed allow-list of keys the admin panel is allowed to edit. The public
// GET only ever returns these same keys, so the panel can never be used to
// smuggle arbitrary data into the page.
const EDITABLE_KEYS = new Set([
  'hero_eyebrow',
  'hero_title_line1',
  'hero_title_line2',
  'hero_subtitle',
  'shopee_url',
  'mercadolivre_url',
  'promo_banner_enabled',
  'promo_banner_text',
  'alpha_run_shopee_url',
  'alpha_run_mercadolivre_url',
  'alpha_run_price_current',
  'alpha_run_price_original',
  'alpha_run_promo_enabled',
  'alpha_run_promo_label',
  'alpha_run_active',
]);

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Public on purpose: the landing page's own script calls this on load
    // to apply any admin-edited overrides. Only ever exposes the
    // non-sensitive marketing fields above — nothing from leads/clicks/auth.
    try {
      const result = await db.query('SELECT key, value FROM site_content');
      const map = {};
      (result.rows || []).forEach((row) => {
        map[row.key] = row.value;
      });
      res.status(200).json({ content: map });
    } catch (err) {
      // Fail soft: an empty map means the page just keeps its static defaults.
      res.status(200).json({ content: {} });
    }
    return;
  }

  if (req.method === 'POST') {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const body = parseBody(req);
    const updates = body.content && typeof body.content === 'object' ? body.content : {};

    const rows = Object.entries(updates)
      .filter(([key]) => EDITABLE_KEYS.has(key))
      .map(([key, value]) => ({
        key,
        value: String(value ?? '').slice(0, 2000),
      }));

    if (!rows.length) {
      res.status(400).json({ error: 'no_valid_fields' });
      return;
    }

    try {
      for (const row of rows) {
        await db.query(
          `INSERT INTO site_content (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
          [row.key, row.value]
        );
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'server_error' });
    }
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
