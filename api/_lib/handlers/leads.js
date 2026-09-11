const db = require('../db');
const { parseBody } = require('../body');

// Versão do texto de consentimento mostrado no formulário (fica gravada no
// campo "source" do lead, como registro de qual aviso a pessoa aceitou).
const CONSENT_VERSION = 'site:consentimento-v1';

// Proteção simples contra envio em massa.
const MAX_LEADS_PER_WINDOW = 30;
const WINDOW_MINUTES = 10;

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Public endpoint: captures a lead from the "Seja um alpinista" form.
 * Requires explicit consent, ignores repeated e-mails, drops simple bots via a
 * hidden honeypot field and caps how many new leads are accepted per window.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const honeypot = String(body.website || '').trim();

  if (honeypot) {
    // Looks like a bot filled the hidden field — respond as if it worked, store nothing.
    res.status(200).json({ ok: true });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'invalid_email', message: 'Informe um e-mail válido.' });
    return;
  }

  if (body.consent !== true) {
    res.status(400).json({
      error: 'consent_required',
      message: 'Para receber novidades, marque que concorda com o aviso de privacidade.',
    });
    return;
  }

  try {
    const check = await db.query(
      `SELECT EXISTS (SELECT 1 FROM leads WHERE lower(email) = $1) AS already,
              (SELECT count(*)::int FROM leads WHERE created_at >= now() - make_interval(mins => $2)) AS recent`,
      [email, WINDOW_MINUTES]
    );
    const { already, recent } = check.rows[0];

    if (already) {
      // Same answer as a new signup: doesn't reveal who is already on the list.
      res.status(200).json({ ok: true });
      return;
    }
    if (recent >= MAX_LEADS_PER_WINDOW) {
      res.status(429).json({ error: 'too_many_requests', message: 'Muitos cadastros agora. Tente novamente em alguns minutos.' });
      return;
    }

    await db.query('INSERT INTO leads (name, email, source) VALUES ($1, $2, $3)', [name || null, email, CONSENT_VERSION]);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[leads] falha ao salvar:', err && err.message);
    res.status(500).json({ error: 'server_error', message: 'Não foi possível salvar agora. Tente novamente em instantes.' });
  }
};
