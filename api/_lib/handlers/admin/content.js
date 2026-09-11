const db = require('../../db');
const { parseBody } = require('../../body');
const site = require('../../site');

// Fixed allow-list of keys the admin panel is allowed to edit (with max
// length). The panel can never be used to smuggle arbitrary data into the page.
// Links de compra agora ficam em cada produto, não aqui.
const EDITABLE_KEYS = {
  hero_eyebrow: 120,
  hero_title_line1: 80,
  hero_title_line2: 80,
  hero_subtitle: 300,
  promo_banner_enabled: 5,
  promo_banner_text: 200,
};

/** Protected (enforced by the admin router): home texts and promo banner. */
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const result = await db.query('SELECT key, value FROM site_content WHERE key = ANY($1::text[])', [
      Object.keys(EDITABLE_KEYS),
    ]);
    const content = {};
    result.rows.forEach((row) => {
      content[row.key] = row.value || '';
    });
    res.status(200).json({ content, defaults: site.contentDefaults });
    return;
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    const updates = body.content && typeof body.content === 'object' ? body.content : {};

    const rows = Object.entries(updates)
      .filter(([key]) => Object.prototype.hasOwnProperty.call(EDITABLE_KEYS, key))
      .map(([key, value]) => {
        let clean = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
        if (key === 'promo_banner_enabled') clean = clean === 'true' ? 'true' : 'false';
        return { key, value: clean.slice(0, EDITABLE_KEYS[key]) };
      });

    if (!rows.length) {
      res.status(400).json({ error: 'no_valid_fields' });
      return;
    }

    await db.transaction(async (client) => {
      for (const row of rows) {
        await client.query(
          `INSERT INTO site_content (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
          [row.key, row.value]
        );
      }
    });
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
