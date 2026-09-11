/**
 * Vercel's Node runtime usually parses a JSON request body into req.body
 * automatically, but this normalizes the few edge cases (string body,
 * missing body, malformed JSON — which makes the req.body getter throw)
 * so every handler can just call parseBody(req).
 */
function parseBody(req) {
  let body;
  try {
    body = req.body;
  } catch (e) {
    return {};
  }
  if (!body) return {};
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }
  return typeof body === 'object' ? body : {};
}

module.exports = { parseBody };
