const db = require('../db');
const { parseBody } = require('../body');
const { MARKETPLACES, id } = require('../validate');
const rateLimit = require('../rate-limit');

const PLACEMENTS = new Set(['card', 'produto']);

// Cliques contados por visitante (hash do IP) a cada 10 minutos; acima disso
// não entram na estatística, para ninguém inflar os números com um script.
const CLICKS_PER_IP = 60;
const CLICKS_WINDOW_SECONDS = 10 * 60;

/**
 * Public endpoint: fire-and-forget click tracking for the marketplace buttons.
 * The target URL is read from the product itself (never trusted from the
 * client), and only active products are counted. Always responds 200 so it
 * never disrupts the visitor's click-through.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);
  const productId = id(body.productId);
  const marketplace = String(body.marketplace || '');
  const placement = PLACEMENTS.has(body.placement) ? body.placement : 'card';
  const page = String(body.page || '/').slice(0, 200);

  if (
    productId &&
    Object.prototype.hasOwnProperty.call(MARKETPLACES, marketplace) &&
    (await rateLimit.allow(req, 'clicks', CLICKS_PER_IP, CLICKS_WINDOW_SECONDS))
  ) {
    const column = MARKETPLACES[marketplace].column;
    try {
      await db.query(
        `INSERT INTO clicks (label, target_url, page, product_id, marketplace)
         SELECT $1, p.${column}, $2, p.id, $3 FROM products p
         WHERE p.id = $4 AND p.active AND p.${column} IS NOT NULL`,
        [`${placement}-${marketplace}`, page, marketplace, productId]
      );
    } catch (err) {
      // Swallow errors — click tracking should never break the UX.
    }
  }

  res.status(200).json({ ok: true });
};
