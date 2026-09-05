const db = require('./_lib/db');

/**
 * Public endpoint that streams a single uploaded product photo by id.
 * Kept separate from /api/product-images (which only ever returns small
 * JSON metadata) so the page can reference <img src="/api/product-image?id=123">
 * directly and let the browser cache it like any other static asset.
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const id = parseInt(req.query.id, 10);
  if (!id) {
    res.status(400).end('missing id');
    return;
  }

  try {
    const result = await db.query(
      'SELECT content_type, image_data FROM product_images WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).end('not found');
      return;
    }
    res.setHeader('Content-Type', row.content_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.status(200).end(row.image_data);
  } catch (err) {
    res.status(500).end('server error');
  }
};
