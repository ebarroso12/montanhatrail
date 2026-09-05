const db = require('./_lib/db');
const { parseBody } = require('./_lib/body');

// Fixed allow-list of click labels this site actually emits — keeps the
// clicks table meaningful and prevents arbitrary free-text spam.
const ALLOWED_LABELS = new Set([
  'header-shopee',
  'hero-shopee',
  'hero-mercadolivre',
  'atributos-shopee',
  'atributos-mercadolivre',
  'tamanhos-shopee',
  'cta-final-shopee',
  'cta-final-mercadolivre',
  'footer-shopee',
  'footer-mercadolivre',
  'alpha-hero-shopee',
  'alpha-hero-mercadolivre',
  'alpha-cta-shopee',
  'alpha-cta-mercadolivre',
  'alpha-footer-shopee',
  'alpha-footer-mercadolivre',
  'alpha-lineup-color',
]);

/**
 * Public endpoint: fire-and-forget click tracking for the marketplace CTA
 * buttons. Always responds 200 so it never disrupts the user's click-through,
 * even when the label is unrecognized or storage fails.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);
  const label = String(body.label || '').slice(0, 100);
  const targetUrl = String(body.targetUrl || '').slice(0, 500);
  const page = String(body.page || '/').slice(0, 200);

  if (!label || !ALLOWED_LABELS.has(label)) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    await db.query(
      'INSERT INTO clicks (label, target_url, page) VALUES ($1, $2, $3)',
      [label, targetUrl || null, page]
    );
  } catch (err) {
    // Swallow errors — click tracking should never break the UX.
  }

  res.status(200).json({ ok: true });
};
