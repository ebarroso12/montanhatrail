const db = require('../db');
const { parseBody } = require('../body');
const { instagramHandle, ValidationError } = require('../validate');
const rateLimit = require('../rate-limit');

/**
 * Public endpoint: cadastro de novidades, vindo do formulário "Seja um
 * alpinista" (source "site") ou do pop-up de entrada (source "popup").
 *
 * Cada envio vira um lead (histórico) e cria/atualiza o visitante daquele
 * e-mail (um registro por pessoa). Exige consentimento, descarta bots pelo
 * campo honeypot e limita envios por IP. A resposta é a mesma para e-mail novo
 * ou já cadastrado, para não revelar quem está na lista.
 */

// Versão do aviso aceito. Mude quando o texto do consentimento ou o aviso de
// privacidade mudarem de forma relevante.
const CONSENT_VERSION = 'consentimento-v2';
const SOURCES = new Set(['site', 'popup']);

const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_SECONDS = 10 * 60;
// Teto geral, só para ataque distribuído (muitos IPs ao mesmo tempo).
const GLOBAL_LIMIT = 300;
const GLOBAL_WINDOW_MINUTES = 10;

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function tooMany(res) {
  res.status(429).json({ error: 'too_many_requests', message: 'Muitos cadastros agora. Tente novamente em alguns minutos.' });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);
  const source = SOURCES.has(body.source) ? body.source : 'site';
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const honeypot = String(body.website || '').trim();

  if (honeypot) {
    // Looks like a bot filled the hidden field — respond as if it worked, store nothing.
    res.status(200).json({ ok: true });
    return;
  }

  if (source === 'popup' && !name) {
    res.status(400).json({ error: 'validation', field: 'name', message: 'Informe seu nome.' });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'invalid_email', field: 'email', message: 'Informe um e-mail válido.' });
    return;
  }

  let instagram;
  try {
    instagram = instagramHandle(body.instagram);
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    res.status(400).json({ error: 'validation', field: 'instagram', message: err.message });
    return;
  }

  if (body.consent !== true) {
    res.status(400).json({
      error: 'consent_required',
      field: 'consent',
      message: 'Para receber novidades, marque que concorda com o aviso de privacidade.',
    });
    return;
  }

  if (!(await rateLimit.allow(req, 'leads', PER_IP_LIMIT, PER_IP_WINDOW_SECONDS))) {
    tooMany(res);
    return;
  }

  try {
    const saved = await db.transaction(async (client) => {
      const recent = await client.query(
        'SELECT count(*)::int AS n FROM leads WHERE created_at >= now() - make_interval(mins => $1)',
        [GLOBAL_WINDOW_MINUTES]
      );
      if (recent.rows[0].n >= GLOBAL_LIMIT) return false;

      // Visitante: um por e-mail. Nome e Instagram já gravados não são trocados
      // por um envio posterior (ninguém altera os dados de outra pessoa só
      // digitando o e-mail dela); campos vazios são completados.
      await client.query(
        `INSERT INTO visitors (email, name, instagram, first_source, last_source, consent_at, consent_version)
         VALUES ($1::text, $2::text, $3::text, $4::text, $4::text, now(), $5::text)
         ON CONFLICT (email) DO UPDATE SET
           name = COALESCE(visitors.name, EXCLUDED.name),
           instagram = COALESCE(visitors.instagram, EXCLUDED.instagram),
           last_source = EXCLUDED.last_source,
           signups = visitors.signups + 1,
           consent_at = EXCLUDED.consent_at,
           consent_version = EXCLUDED.consent_version`,
        [email, name || null, instagram, source, CONSENT_VERSION]
      );

      // Lead: histórico de envios. O mesmo e-mail pela mesma origem em 24 h não duplica.
      await client.query(
        `INSERT INTO leads (name, email, instagram, source, consent_at, consent_version)
         SELECT $1::text, $2::text, $3::text, $4::text, now(), $5::text
         WHERE NOT EXISTS (
           SELECT 1 FROM leads
           WHERE lower(email) = $2::text AND source = $4::text AND created_at >= now() - interval '1 day'
         )`,
        [name || null, email, instagram, source, CONSENT_VERSION]
      );
      return true;
    });

    if (!saved) {
      tooMany(res);
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[leads] falha ao salvar:', err && err.message);
    res.status(500).json({ error: 'server_error', message: 'Não foi possível salvar agora. Tente novamente em instantes.' });
  }
};
