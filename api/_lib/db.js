const { Pool } = require('pg');

let pool;

/**
 * Postgres connection to the project's dedicated Supabase database, via the
 * Supavisor shared pooler in transaction mode — the mode Supabase recommends
 * for serverless/edge functions. The direct connection host
 * (db.<ref>.supabase.co) is IPv6-only on the free tier and is NOT reachable
 * from Vercel's serverless functions (confirmed: DNS lookup fails there).
 * The pooler is IPv4 on every plan, host aws-<shard>-<region>.pooler.supabase.co,
 * port 6543, and the username must be "<db_user>.<project_ref>" (Supavisor
 * routes to the right project using that suffix).
 *
 * Connects using a role created specifically for this app (app_service)
 * rather than the Supabase service_role REST key. The role has BYPASSRLS
 * plus explicit CRUD grants on the public schema — equivalent privilege
 * level to the service_role key, just over the native Postgres wire
 * protocol instead of PostgREST. Credentials live only in Vercel's
 * server-side environment variables and are never sent to the browser.
 */
function getPool() {
  if (!pool) {
    const host = process.env.PGHOST;
    const password = process.env.PGPASSWORD;
    if (!host || !password) {
      throw new Error(
        'Banco de dados não configurado: defina PGHOST, PGPASSWORD, PGUSER (formato usuario.ref_do_projeto) e PGPORT=6543 nas variáveis de ambiente do projeto na Vercel.'
      );
    }
    pool = new Pool({
      host,
      port: Number(process.env.PGPORT || 6543),
      user: process.env.PGUSER || 'app_service',
      password,
      database: process.env.PGDATABASE || 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
  }
  return pool;
}

async function query(text, params) {
  let client;
  try {
    client = await getPool().connect();
  } catch (err) {
    console.error('[db] falha ao conectar no Postgres:', err && err.message, err && err.code);
    throw err;
  }
  try {
    return await client.query(text, params);
  } catch (err) {
    console.error('[db] falha ao executar query:', err && err.message, err && err.code);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query };
