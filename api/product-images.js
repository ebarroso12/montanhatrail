const db = require('./_lib/db');
const { parseBody } = require('./_lib/body');
const { requireAdmin } = require('./_lib/auth');

// Fixed allow-lists — same defensive pattern used for click labels and
// editable content keys: keeps this endpoint from becoming a place to stash
// arbitrary products/colors.
const ALLOWED_PRODUCTS = new Set(['alpha-run']);
const ALLOWED_COLORS = new Set(['verde', 'azul', 'pink', 'preto']);
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Vercel's serverless functions cap the request body at 4.5MB regardless of
// any in-code config, and base64 inflates raw bytes by ~33% — so the raw
// image has to stay comfortably under that after encoding. The admin panel
// resizes/compresses photos client-side before upload, so this ceiling is
// only a hard safety net, not the expected size.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB raw (~4MB base64)
const MAX_IMAGES_PER_COLOR = 10;

/**
 * Public metadata for the product-color image manager built into the admin
 * panel and consumed by the storefront pages themselves. Never returns the
 * binary data — that's served separately by /api/product-image so this
 * response stays tiny even with several images per color.
 */
async function listImages(product) {
  const result = await db.query(
    'SELECT id, color_key, position, is_hero FROM product_images WHERE product = $1 ORDER BY color_key, position ASC, id ASC',
    [product]
  );
  const colors = {};
  (result.rows || []).forEach((row) => {
    if (!colors[row.color_key]) colors[row.color_key] = [];
    colors[row.color_key].push({ id: row.id, position: row.position, isHero: row.is_hero });
  });
  return colors;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const product = String(req.query.product || '').slice(0, 60);
    if (!ALLOWED_PRODUCTS.has(product)) {
      res.status(200).json({ colors: {} });
      return;
    }
    try {
      const colors = await listImages(product);
      res.status(200).json({ colors });
    } catch (err) {
      res.status(200).json({ colors: {} });
    }
    return;
  }

  if (req.method === 'POST') {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    const body = parseBody(req);
    const action = String(body.action || '');

    try {
      if (action === 'upload') {
        const product = String(body.product || '');
        const color = String(body.color || '');
        if (!ALLOWED_PRODUCTS.has(product) || !ALLOWED_COLORS.has(color)) {
          res.status(400).json({ error: 'invalid_product_or_color' });
          return;
        }
        const contentType = String(body.contentType || '');
        if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
          res.status(400).json({ error: 'invalid_content_type' });
          return;
        }
        const base64 = String(body.imageBase64 || '');
        if (!base64) {
          res.status(400).json({ error: 'missing_image' });
          return;
        }
        let buffer;
        try {
          buffer = Buffer.from(base64, 'base64');
        } catch (e) {
          res.status(400).json({ error: 'invalid_base64' });
          return;
        }
        if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
          res.status(400).json({ error: 'image_too_large' });
          return;
        }

        const countResult = await db.query(
          'SELECT count(*)::int AS n, coalesce(max(position), -1) AS max_pos FROM product_images WHERE product = $1 AND color_key = $2',
          [product, color]
        );
        const count = (countResult.rows[0] && countResult.rows[0].n) || 0;
        if (count >= MAX_IMAGES_PER_COLOR) {
          res.status(400).json({ error: 'too_many_images' });
          return;
        }
        const nextPosition = ((countResult.rows[0] && countResult.rows[0].max_pos) || -1) + 1;
        const isHero = !!body.isHero;

        if (isHero) {
          await db.query(
            'UPDATE product_images SET is_hero = FALSE WHERE product = $1 AND color_key = $2',
            [product, color]
          );
        }

        const insertResult = await db.query(
          `INSERT INTO product_images (product, color_key, position, is_hero, content_type, image_data, byte_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [product, color, nextPosition, isHero, contentType, buffer, buffer.length]
        );

        res.status(200).json({ ok: true, id: insertResult.rows[0].id });
        return;
      }

      if (action === 'setHero') {
        const id = parseInt(body.id, 10);
        if (!id) {
          res.status(400).json({ error: 'invalid_id' });
          return;
        }
        const rowResult = await db.query(
          'SELECT product, color_key FROM product_images WHERE id = $1',
          [id]
        );
        const row = rowResult.rows[0];
        if (!row) {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        await db.query(
          'UPDATE product_images SET is_hero = FALSE WHERE product = $1 AND color_key = $2',
          [row.product, row.color_key]
        );
        await db.query('UPDATE product_images SET is_hero = TRUE WHERE id = $1', [id]);
        res.status(200).json({ ok: true });
        return;
      }

      if (action === 'reorder') {
        const product = String(body.product || '');
        const color = String(body.color || '');
        const order = Array.isArray(body.order) ? body.order : [];
        if (!ALLOWED_PRODUCTS.has(product) || !ALLOWED_COLORS.has(color) || !order.length) {
          res.status(400).json({ error: 'invalid_request' });
          return;
        }
        for (let i = 0; i < order.length; i++) {
          const id = parseInt(order[i], 10);
          if (!id) continue;
          await db.query(
            'UPDATE product_images SET position = $1 WHERE id = $2 AND product = $3 AND color_key = $4',
            [i, id, product, color]
          );
        }
        res.status(200).json({ ok: true });
        return;
      }

      if (action === 'delete') {
        const id = parseInt(body.id, 10);
        if (!id) {
          res.status(400).json({ error: 'invalid_id' });
          return;
        }
        await db.query('DELETE FROM product_images WHERE id = $1', [id]);
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: 'unknown_action' });
    } catch (err) {
      res.status(500).json({ error: 'server_error' });
    }
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
