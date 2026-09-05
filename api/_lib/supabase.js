const { createClient } = require('@supabase/supabase-js');

let client;

/**
 * Lazily creates a single Supabase client using the service-role key.
 * The service-role key must NEVER be sent to the browser — it only
 * ever lives in Vercel's server-side environment variables and is
 * used exclusively inside these /api functions.
 */
function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'Supabase não está configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do projeto na Vercel.'
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return client;
}

module.exports = { getSupabase };
