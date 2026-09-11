const site = require('../site');

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const priceFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatPrice(value) {
  return priceFormatter.format(value);
}

function absoluteUrl(base, path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return base + (path.startsWith('/') ? path : `/${path}`);
}

function truncate(value, max) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

const MOUNTAIN_PATH = 'M3 20 L9.5 8 L13 14.5 L15.5 10 L21 20 Z';

const FAVICON = '/images/marca/favicon-64.png';

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;

/**
 * Marca: no cabeçalho, o símbolo "A" + o nome em texto (legível em qualquer
 * tamanho); no rodapé, a logo completa com o slogan. Sem logo configurada,
 * volta para o ícone de montanha + nome.
 */
function brandInner(variant) {
  const logo = site.logo;
  if (logo && variant === 'footer') {
    return `<img class="brand-logo-full" src="${esc(logo.full)}" alt="${esc(site.name)} — Fé, esporte e montanha. Viva forte." width="${Number(logo.fullWidth) || ''}" height="${Number(logo.fullHeight) || ''}" loading="lazy" decoding="async">`;
  }
  const mark = logo
    ? `<img class="brand-symbol" src="${esc(logo.symbol)}" alt="" width="48" height="48">`
    : `<svg viewBox="0 0 24 24" class="brand-mark" aria-hidden="true" focusable="false"><path d="${MOUNTAIN_PATH}" fill="currentColor"/></svg>`;
  return `${mark}<span class="brand-word">ALPINS</span>`;
}

function brand(extraClass, variant) {
  return `<a class="brand${extraClass ? ` ${extraClass}` : ''}" href="/" aria-label="${esc(site.name)} — página inicial">${brandInner(variant)}</a>`;
}

function header() {
  return `<header class="site-header" id="topo">
  <div class="wrap header-inner">
    ${brand()}
    <nav class="main-nav" id="main-nav" aria-label="Navegação principal">
      <a href="/">Início</a>
      <a href="/#categorias">Categorias</a>
      <a href="/catalogo">Catálogo</a>
      <a href="/#novidades">Novidades</a>
      <a href="/#contato">Contato</a>
    </nav>
    <a class="btn btn-ghost btn-sm header-cta" href="${esc(site.whatsappUrl())}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
    <button class="nav-toggle" type="button" aria-label="Abrir menu" aria-controls="main-nav" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
}

function footer(ctx) {
  const year = new Date().getFullYear();
  const categories = (ctx && ctx.categories) || [];
  const partner = site.partner;
  const dev = site.developer;
  return `<footer class="site-footer">
  <div class="wrap footer-top">
    ${brand('brand-footer', 'footer')}
    <p>Produtos selecionados e organizados por categoria, com links diretos para a Shopee e o Mercado Livre.</p>
    <div class="cta-row">
      <a class="btn btn-whatsapp btn-sm" href="${esc(site.whatsappUrl())}" target="_blank" rel="noopener noreferrer">WhatsApp ${esc(site.phone.display)} ↗</a>
      <a class="btn btn-outline-dark btn-sm" href="/catalogo">Ver catálogo</a>
    </div>
    ${
      categories.length
        ? `<nav class="footer-cats" aria-label="Categorias">${categories
            .map((c) => `<a href="/categoria/${esc(c.slug)}">${esc(c.name)}</a>`)
            .join('')}</nav>`
        : ''
    }
  </div>

  <div class="wrap footer-mid">
    <div class="partner-card">
      <img class="partner-logo" src="${esc(partner.logo)}" alt="Logomarca do aplicativo ${esc(partner.name)}" width="56" height="56" loading="lazy" decoding="async">
      <div>
        <p class="eyebrow">Aplicativo parceiro</p>
        <h3><a target="_blank" rel="noopener noreferrer" href="${esc(partner.url)}">${esc(partner.name)} ↗</a></h3>
        <p class="partner-tagline">${esc(partner.tagline)}</p>
        <p class="body-text small">${esc(partner.description)}</p>
      </div>
    </div>
    <div class="dev-card">
      <p class="eyebrow">Desenvolvimento</p>
      <p class="body-text small">© ${year} Desenvolvido por ${esc(dev.name)}.</p>
      <p class="dev-links">
        <a target="_blank" rel="noopener noreferrer" href="${esc(dev.instagram.url)}">${esc(dev.instagram.label)}</a>
        <a target="_blank" rel="noopener noreferrer" href="${esc(dev.website.url)}">${esc(dev.website.label)}</a>
        <a href="mailto:${esc(dev.email)}">${esc(dev.email)}</a>
      </p>
    </div>
  </div>

  <div class="footer-legal">
    <div class="wrap legal-note">
      <p class="legal-brand">© ${year} ${esc(site.name)} · WhatsApp <a href="tel:${esc(site.phone.tel)}">${esc(site.phone.display)}</a></p>
      <p>A ${esc(site.name)} divulga produtos anunciados na Shopee e no Mercado Livre. A compra, o pagamento e a entrega acontecem no marketplace, que define preço, estoque, frete e condições no momento da compra. Alguns links podem ser de programas de afiliados.</p>
    </div>
  </div>
</footer>`;
}

function promoBanner(ctx) {
  const content = ctx && ctx.content;
  if (!content || content.promo_banner_enabled !== 'true' || !content.promo_banner_text) return '';
  return `<div class="promo-banner" role="note"><p>${esc(content.promo_banner_text)}</p></div>`;
}

/**
 * Full public page. `title` is the page-specific part (the brand is appended);
 * pass no title for the home page.
 */
function layout(opts) {
  const ctx = opts.ctx;
  const fullTitle = opts.title ? `${opts.title} | ${site.name}` : `${site.name} — Catálogo de produtos selecionados`;
  const description = truncate(opts.description || site.description, 200);
  const canonical = absoluteUrl(ctx.base, opts.path || '/');
  const image = absoluteUrl(ctx.base, opts.image || site.ogImage || site.heroImage);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${opts.noindex ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${opts.ogType === 'product' ? 'product' : 'website'}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14170f">
${FONTS}
<link rel="stylesheet" href="/css/style.css">
<link rel="icon" type="image/png" href="${FAVICON}">
<link rel="apple-touch-icon" href="/images/marca/apple-touch-icon.png">
</head>
<body class="${esc(opts.bodyClass || '')}">
<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
${promoBanner(ctx)}
${header()}
<main id="conteudo">
${opts.content}
</main>
${footer(ctx)}
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Imagem ampliada" hidden>
  <button class="lightbox-close" id="lightbox-close" type="button" aria-label="Fechar">✕</button>
  <img id="lightbox-img" alt="">
</div>
<script src="/js/main.js" defer></script>
</body>
</html>`;
}

module.exports = {
  esc,
  formatPrice,
  absoluteUrl,
  truncate,
  layout,
  brandInner,
  FONTS,
  FAVICON,
  MOUNTAIN_PATH,
};
