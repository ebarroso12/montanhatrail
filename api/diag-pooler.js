const { Pool } = require('pg');

// Temporary diagnostic endpoint: tests connectivity to the Supavisor pooler
// shard candidates for this project from Vercel's own network, since the
// direct-connection host (db.<ref>.supabase.co) is IPv6-only and Vercel's
// serverless functions can't reach it (ENOTFOUND). Never returns connection
// details to the client — only logs server-side. Remove after diagnosis.
module.exports = async (req, res) => {
  const projectRef = 'eogykziuhsblzulqvika';
  const password = process.env.PGPASSWORD;
  const user = `${process.env.PGUSER || 'app_service'}.${projectRef}`;
  const candidates = [
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-1-sa-east-1.pooler.supabase.com',
  ];

  const results = [];
  for (const host of candidates) {
    const pool = new Pool({
      host,
      port: 6543,
      user,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
      max: 1,
    });
    try {
      const r = await pool.query('select 1 as ok');
      results.push({ host, ok: true, rows: r.rows });
      console.log('[diag-pooler] SUCCESS', host, JSON.stringify(r.rows));
    } catch (err) {
      results.push({ host, ok: false, error: err.message, code: err.code });
      console.log('[diag-pooler] FAIL', host, err.message, err.code);
    } finally {
      await pool.end().catch(() => {});
    }
  }

  res.status(200).json({ ok: true });
};
