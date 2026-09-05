const { Pool } = require('pg');

let pool;

/**
 * Direct Postgres connection to the project's dedicated Supabase database,
 * using a role created specifically for this app (app_service) rather than
 * the Supabase service_role REST key. The role has BYPASSRLS plus explicit
 * CRUD grants on the public schema — equivalent privilege level to the
 * service_role key, just over the native Postgres wire protocol instead of
 * PostgREST. Credentials live only in Vercel's server-side environment
 * variables and are never sent to the browser.
 */
function getPool() {
  if (!pool) {
    const host = process.env.PGHOST;
    const password = process.env.PGPASSWORD;
    if (!host || !password) {
      throw new Error(
        'Banco de dados não configurado: defina PGHOST, PGPASSWORD (e opcionalmente PGUSER/PGDATABASE/PGPORT) nas variáveis de ambiente do projeto na Vercel.'
      );
    }
    pool = new Pool({
      host,
      port: Number(process.env.PGPORT || 5432),
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
