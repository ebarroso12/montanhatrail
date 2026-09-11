const db = require('../../db');
const storage = require('../../storage');

/** Protected (enforced by the admin router): numbers for the dashboard overview. */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const result = await db.query(
    `SELECT
       (SELECT count(*)::int FROM products) AS products_total,
       (SELECT count(*)::int FROM products WHERE active) AS products_active,
       (SELECT count(*)::int FROM products WHERE featured) AS products_featured,
       (SELECT count(*)::int FROM products WHERE shopee_url IS NULL AND mercadolivre_url IS NULL) AS products_without_links,
       (SELECT count(*)::int FROM categories) AS categories_total,
       (SELECT count(*)::int FROM categories WHERE active) AS categories_active,
       (SELECT count(*)::int FROM leads) AS leads_total,
       (SELECT count(*)::int FROM clicks WHERE created_at >= now() - interval '7 days') AS clicks_7d`
  );
  const row = result.rows[0];

  res.status(200).json({
    products: {
      total: row.products_total,
      active: row.products_active,
      featured: row.products_featured,
      withoutLinks: row.products_without_links,
    },
    categories: { total: row.categories_total, active: row.categories_active },
    leads: row.leads_total,
    clicks7d: row.clicks_7d,
    storageConfigured: storage.isConfigured(),
  });
};
