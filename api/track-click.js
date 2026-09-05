const { getSupabase } = require('./_lib/supabase');
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
    const supabase = getSupabase();
    await supabase.from('clicks').insert({ label, target_url: targetUrl || null, page });
  } catch (err) {
    // Swallow errors — click tracking should never break the UX.
  }

  res.status(200).json({ ok: true });
};
