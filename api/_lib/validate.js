/**
 * Server-side input validation for the admin CRUD. Every helper either
 * returns a clean value or throws ValidationError(field, message) with a
 * message that can be shown as-is in the panel.
 */

const storage = require('./storage');

class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
  }
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Marketplaces aceitos e os domínios oficiais de cada um (inclui os
// encurtadores de afiliado). Um novo marketplace entra aqui + coluna no banco.
const MARKETPLACES = {
  shopee: {
    label: 'Shopee',
    column: 'shopee_url',
    domains: ['shopee.com.br', 'shope.ee', 'shp.ee'],
  },
  mercadolivre: {
    label: 'Mercado Livre',
    column: 'mercadolivre_url',
    domains: ['mercadolivre.com.br', 'mercadolivre.com', 'meli.la'],
  },
};

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function text(body, field, opts) {
  let value = body[field];
  if (value == null) value = '';
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(field, `${opts.label}: valor inválido.`);
  }
  value = String(value).replace(/\r\n?/g, '\n').replace(CONTROL_CHARS_RE, '');
  value = opts.multiline ? value.trim() : value.replace(/\s+/g, ' ').trim();
  if (!value) {
    if (opts.required) throw new ValidationError(field, `Informe ${opts.label.toLowerCase()}.`);
    return null;
  }
  if (value.length > opts.max) {
    throw new ValidationError(field, `${opts.label}: máximo de ${opts.max} caracteres.`);
  }
  return value;
}

function slug(body, field, fallbackText) {
  const raw = body[field] == null ? '' : String(body[field]).trim();
  const value = raw ? raw.toLowerCase() : slugify(fallbackText);
  if (!value || value.length > 80 || !SLUG_RE.test(value)) {
    throw new ValidationError(field, 'Slug inválido: use letras minúsculas sem acento, números e hífens (ex.: tenis-de-trilha).');
  }
  return value;
}

function bool(body, field) {
  const v = body[field];
  return v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
}

function int(body, field, opts) {
  const raw = body[field];
  if (raw == null || raw === '') return opts.default;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < opts.min || n > opts.max) {
    throw new ValidationError(field, `${opts.label}: informe um número inteiro entre ${opts.min} e ${opts.max}.`);
  }
  return n;
}

/** Accepts 159.9, "159,90", "1.299,90", "R$ 89" → Number with 2 decimals, or null. */
function money(body, field, opts) {
  const raw = body[field];
  if (raw == null || raw === '') return null;
  let s = String(raw).replace(/R\$/gi, '').replace(/\s+/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) {
    throw new ValidationError(field, `${opts.label}: valor inválido (ex.: 149,90).`);
  }
  return Math.round(Number(s) * 100) / 100;
}

function parseHttpsUrl(value, field, label) {
  if (/\s/.test(value) || value.length > 1000) {
    throw new ValidationError(field, `${label}: URL inválida.`);
  }
  let url;
  try {
    url = new URL(value);
  } catch (e) {
    throw new ValidationError(field, `${label}: URL inválida.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new ValidationError(field, `${label}: use um endereço https:// válido.`);
  }
  return url;
}

function hostMatches(host, domains) {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

function marketplaceUrl(body, field, marketplaceKey) {
  const mk = MARKETPLACES[marketplaceKey];
  const value = body[field] == null ? '' : String(body[field]).trim();
  if (!value) return null;
  const url = parseHttpsUrl(value, field, `Link ${mk.label}`);
  if (!hostMatches(url.hostname.toLowerCase(), mk.domains)) {
    throw new ValidationError(field, `Link ${mk.label}: o endereço precisa ser de ${mk.domains.join(', ')}.`);
  }
  return value;
}

/** Image URL: an https URL, a file from our own Storage bucket, or a file published under /images/. */
function imageUrl(rawValue, field, label) {
  const value = rawValue == null ? '' : String(rawValue).trim();
  if (!value) return null;
  if (storage.isOwnPublicUrl(value)) return value;
  if (value.startsWith('/')) {
    if (!/^\/images\/[A-Za-z0-9._\/-]+$/.test(value) || value.includes('..')) {
      throw new ValidationError(field, `${label}: caminho de imagem inválido.`);
    }
    return value;
  }
  parseHttpsUrl(value, field, label);
  return value;
}

function imageList(body, field, max) {
  const raw = body[field];
  if (raw == null || raw === '') return [];
  if (!Array.isArray(raw)) throw new ValidationError(field, 'Galeria inválida.');
  if (raw.length > max) throw new ValidationError(field, `A galeria aceita no máximo ${max} imagens.`);
  return raw.map((item) => imageUrl(item, field, 'Imagem da galeria')).filter(Boolean);
}

function id(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

module.exports = {
  ValidationError,
  MARKETPLACES,
  SLUG_RE,
  slugify,
  text,
  slug,
  bool,
  int,
  money,
  marketplaceUrl,
  imageUrl,
  imageList,
  id,
};
