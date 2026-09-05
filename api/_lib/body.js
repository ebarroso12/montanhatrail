/**
 * Vercel's Node runtime usually parses a JSON request body into req.body
 * automatically, but this normalizes the few edge cases (string body,
 * missing body) so every handler can just call parseBody(req).
 */
function parseBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      return {};
    }
  }
  return body;
}

module.exports = { parseBody };
