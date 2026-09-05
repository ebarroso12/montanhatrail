const { getSupabase } = require('./_lib/supabase');
const { parseBody } = require('./_lib/body');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Public endpoint: captures a lead from the "Fique por dentro" form on the
 * landing page. No authentication — anyone can submit a lead, same as any
 * public contact/newsletter form. Input is trimmed and length-capped, and a
 * hidden honeypot field silently drops simple bot submissions.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);

  const name = String(body.name || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 50);
  const message = String(body.message || '').trim().slice(0, 2000);
  const honeypot = String(body.website || '').trim();

  if (honeypot) {
    // Looks like a bot filled the hidden field — respond as if it worked,
    // but don't actually store anything.
    res.status(200).json({ ok: true });
    return;
  }

  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'invalid_email', message: 'Informe um e-mail válido.' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('leads').insert({
      name: name || null,
      email,
      phone: phone || null,
      message: message || null,
      source: 'site',
    });

    if (error) throw error;

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'Não foi possível salvar agora. Tente novamente em instantes.' });
  }
};
