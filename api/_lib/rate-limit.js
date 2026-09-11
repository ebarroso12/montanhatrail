const crypto = require('crypto');
const db = require('./db');
const { getClientIp } = require('./auth');

/**
 * Limite de requisições por visitante para os endpoints públicos (cadastro e
 * cliques). O IP não é guardado: só um hash dele, numa janela de tempo fixa
 * (tabela rate_limits, migration 004). Se o banco falhar, libera — um erro
 * nosso não pode bloquear quem está usando o site.
 */

function clientKey(req) {
  return crypto.createHash('sha256').update(`alpins-rate:${getClientIp(req)}`).digest('hex').slice(0, 40);
}

/** true = pode seguir; false = passou de `limit` envios nesta janela de `windowSeconds`. */
async function allow(req, bucket, limit, windowSeconds) {
  try {
    const result = await db.query(
      `INSERT INTO rate_limits (bucket, key_hash, window_start, hits)
       VALUES ($1, $2, to_timestamp(floor(extract(epoch FROM now()) / $3::int) * $3::int), 1)
       ON CONFLICT (bucket, key_hash, window_start) DO UPDATE SET hits = rate_limits.hits + 1
       RETURNING hits`,
      [bucket, clientKey(req), windowSeconds]
    );
    // Limpeza ocasional das janelas antigas.
    if (Math.random() < 0.02) {
      await db.query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
    }
    return result.rows[0].hits <= limit;
  } catch (err) {
    console.error('[rate-limit] indisponível:', err && err.message);
    return true;
  }
}

module.exports = { allow };
