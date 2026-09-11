const db = require('../../db');

/** Protected (enforced by the admin router): click counts per product and marketplace. */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const totals = await db.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last7
     FROM clicks`
  );

  const byProduct = await db.query(
    `SELECT c.product_id, p.name AS product_name, p.slug AS product_slug, c.marketplace,
            count(*)::int AS total,
            count(*) FILTER (WHERE c.created_at >= now() - interval '7 days')::int AS last7
     FROM clicks c LEFT JOIN products p ON p.id = c.product_id
     WHERE c.marketplace IS NOT NULL
     GROUP BY c.product_id, p.name, p.slug, c.marketplace
     ORDER BY total DESC
     LIMIT 200`
  );

  // Cliques registrados pelo site antigo (antes do catálogo), por rótulo.
  const legacy = await db.query(
    `SELECT label, count(*)::int AS total
     FROM clicks WHERE marketplace IS NULL
     GROUP BY label ORDER BY total DESC LIMIT 50`
  );

  res.status(200).json({
    total: totals.rows[0].total,
    last7: totals.rows[0].last7,
    byProduct: byProduct.rows.map((row) => ({
      productId: row.product_id == null ? null : Number(row.product_id),
      productName: row.product_name,
      productSlug: row.product_slug,
      marketplace: row.marketplace,
      total: row.total,
      last7: row.last7,
    })),
    legacy: legacy.rows,
  });
};
