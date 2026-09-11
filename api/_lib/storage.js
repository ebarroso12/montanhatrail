const crypto = require('crypto');

/**
 * Product images live in Supabase Storage (public bucket), never in Postgres.
 * Uploads go through the admin API using the service key, which only exists
 * in the server environment; the browser only ever sees the public file URL.
 */

const TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'products';
  return url && key ? { url, key, bucket } : null;
}

function isConfigured() {
  return !!config();
}

function authHeaders(key) {
  // Legacy service_role keys are JWTs and go in both headers; the newer
  // sb_secret_ keys are only accepted in the apikey header.
  const headers = { apikey: key };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

/** Detects the real file type from its magic bytes (ignores what the client claims). */
function sniffImageType(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.slice(0, 4).toString('latin1') === 'RIFF' && buffer.slice(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

function storageError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

async function uploadImage(buffer) {
  const cfg = config();
  if (!cfg) throw storageError('storage_not_configured');

  const type = sniffImageType(buffer);
  if (!type) throw storageError('invalid_image');

  const now = new Date();
  const path = [
    'produtos',
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    `${crypto.randomBytes(12).toString('hex')}.${TYPES[type]}`,
  ].join('/');

  const response = await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders(cfg.key),
      'Content-Type': type,
      'Cache-Control': 'max-age=31536000',
      'x-upsert': 'false',
    },
    body: buffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[storage] upload falhou:', response.status, detail.slice(0, 300));
    throw storageError('upload_failed');
  }

  return `${cfg.url}/storage/v1/object/public/${cfg.bucket}/${path}`;
}

function pathFromPublicUrl(cfg, url) {
  const prefix = `${cfg.url}/storage/v1/object/public/${cfg.bucket}/`;
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return /^[A-Za-z0-9/_.-]+$/.test(path) && !path.includes('..') ? path : null;
}

/** True for a public URL of a file inside our own bucket. */
function isOwnPublicUrl(url) {
  const cfg = config();
  return !!(cfg && pathFromPublicUrl(cfg, url));
}

/** Best-effort cleanup of files from our own bucket; other URLs are ignored. */
async function removeImages(urls) {
  const cfg = config();
  if (!cfg) return;
  const prefixes = (urls || []).map((u) => pathFromPublicUrl(cfg, u)).filter(Boolean);
  if (!prefixes.length) return;
  try {
    const response = await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}`, {
      method: 'DELETE',
      headers: { ...authHeaders(cfg.key), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes }),
    });
    if (!response.ok) console.error('[storage] remoção falhou:', response.status);
  } catch (err) {
    console.error('[storage] remoção falhou:', err && err.message);
  }
}

module.exports = { isConfigured, isOwnPublicUrl, sniffImageType, uploadImage, removeImages };
