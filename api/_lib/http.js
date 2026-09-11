const CACHE = {
  // Public pages: the CDN serves them for 60s and may serve a stale copy for
  // another 60s while revalidating, so admin edits show up within ~2 minutes.
  page: 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
  notFound: 'public, max-age=0, s-maxage=30',
  private: 'private, no-store',
};

// No inline scripts anywhere: every script is a same-origin file.
const CSP = [
  "default-src 'self'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self'",
  "connect-src 'self'",
  // Único iframe externo permitido: o player do Spotify (trilha sonora).
  'frame-src https://open.spotify.com',
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function sendHtml(res, status, html, cacheControl) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('Cache-Control', cacheControl || CACHE.private);
  res.status(status).send(html);
}

function sendText(res, status, body, contentType, cacheControl) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl || CACHE.private);
  res.status(status).send(body);
}

function redirect(res, location, status) {
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', CACHE.private);
  res.status(status || 302).end();
}

/**
 * CSRF guard for state-changing requests. Browsers always send Origin on
 * cross-site POST/PUT/DELETE, so a mismatch means another site is trying to
 * ride the admin's cookie. (Combined with SameSite=Lax and JSON-only bodies.)
 */
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch (e) {
    return false;
  }
}

function isJsonRequest(req) {
  return /^application\/json\b/i.test(String(req.headers['content-type'] || ''));
}

module.exports = { CACHE, CSP, sendHtml, sendText, redirect, isSameOrigin, isJsonRequest };
