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
 * Verificação de domínio da Meta. Sem ela o Gerenciador de Eventos não deixa
 * configurar os eventos agregados do pixel. O valor vem do Gerenciador de
 * Negócios (Configurações do negócio → Segurança da marca → Domínios).
 */
function metaDomainVerification() {
  const token = String(process.env.META_DOMAIN_VERIFICATION || '').trim();
  if (!token) return '';
  return `<meta name="facebook-domain-verification" content="${esc(token)}">`;
}

/**
 * Pixel da Meta. O ID vem de META_PIXEL_ID; sem a variável isto devolve string
 * vazia e o site sai exatamente como antes — nada carrega, nada quebra.
 * A compra acontece na Shopee e no Mercado Livre, fora do alcance do pixel,
 * então quem faz o papel de conversão aqui são os eventos disparados no
 * js/main.js: ViewContent, InitiateCheckout (clique no marketplace),
 * Contact (WhatsApp) e Lead (cadastro).
 */
function metaPixel() {
  const pixelId = String(process.env.META_PIXEL_ID || '').trim();
  if (!/^\d{6,20}$/.test(pixelId)) return '';
  return `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${pixelId}&amp;ev=PageView&amp;noscript=1"></noscript>`;
}

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
  if (logo && logo.headerSymbol && logo.wordmark) {
    return `<img class="brand-symbol" src="${esc(logo.headerSymbol)}" alt="" width="196" height="183"><img class="brand-wordmark" src="${esc(logo.wordmark)}" alt="" width="611" height="96">`;
  }
  const mark = logo
    ? `<img class="brand-symbol-square" src="${esc(logo.symbol)}" alt="" width="48" height="48">`
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
    <div class="app-install" id="app-install">
      <p class="eyebrow">${esc(site.name)} no celular</p>
      <p class="body-text small">Instale o site como app: ele abre direto da tela inicial, em tela cheia.</p>
      <button type="button" class="btn btn-dark btn-sm" id="app-install-button" hidden>Instalar o app</button>
      <p class="app-install-help" id="app-install-ios" hidden>No iPhone (Safari): toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
      <p class="app-install-help" id="app-install-other">No Android (Chrome): abra o menu <strong>⋮</strong> e toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>. No iPhone (Safari): <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>.</p>
    </div>
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
      <p class="legal-brand">© ${year} ${esc(site.name)} · WhatsApp <a href="tel:${esc(site.phone.tel)}">${esc(site.phone.display)}</a> · <a href="/privacidade">Aviso de privacidade</a></p>
      <p>A ${esc(site.name)} divulga produtos anunciados na Shopee e no Mercado Livre. A compra, o pagamento e a entrega acontecem no marketplace, que define preço, estoque, frete e condições no momento da compra. Alguns links podem ser de programas de afiliados.</p>
    </div>
  </div>
</footer>`;
}

/**
 * Trilha sonora: botão flutuante + painel com o player do Spotify. O iframe
 * não vai no HTML; o js/main.js cria no primeiro clique (nada do Spotify é
 * carregado antes disso). Minimizar só esconde o painel e a música continua.
 */
function musicPlayer() {
  const music = site.music;
  const playlistId = site.musicPlaylistId();
  if (!playlistId) return '';
  const embed = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;
  return `<div class="music" id="music" data-embed="${esc(embed)}" data-title="${esc(music.title)}">
  <div class="music-panel" id="music-panel" role="region" aria-label="${esc(music.label)}" hidden>
    <div class="music-head">
      <p class="music-title"><span aria-hidden="true">♪</span> ${esc(music.label)}</p>
      <button type="button" class="music-close" id="music-close" aria-label="Minimizar o player (a música continua)">Minimizar</button>
    </div>
    <div class="music-frame" id="music-frame"></div>
    <p class="music-note">A música continua enquanto você navega pelo site. Sem login no Spotify, toca trechos de 30 segundos. <a class="music-open" href="https://open.spotify.com/playlist/${esc(playlistId)}" target="_blank" rel="noopener noreferrer">Abrir no Spotify ↗</a></p>
  </div>
  <button type="button" class="music-toggle" id="music-toggle" aria-controls="music-panel" aria-expanded="false">
    <span class="music-icon" aria-hidden="true">♪</span><span class="float-label">${esc(music.label)}</span>
  </button>
</div>`;
}

/**
 * Botões flutuantes no canto da tela: atendente virtual (WhatsApp da Alpins)
 * e trilha sonora. No celular viram só ícones, com o nome mantido para leitores de tela.
 */
function floatDock() {
  return `<div class="float-dock">
  <a class="float-whatsapp" href="${esc(site.whatsappUrl())}" target="_blank" rel="noopener noreferrer" aria-label="Falar com a atendente virtual da ${esc(site.name)} no WhatsApp">
    <svg class="float-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3C6.98 3 3 6.58 3 11c0 1.9.74 3.64 1.98 5.01L4 21l5.2-1.73c.9.23 1.84.35 2.8.35 5.02 0 9-3.58 9-8.02S17.02 3 12 3zm-4 9.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg><span class="float-label">Atendente virtual</span>
  </a>
  ${musicPlayer()}
</div>`;
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
${site.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(site.googleSiteVerification)}">` : ''}
${metaDomainVerification()}
${metaPixel()}
${FONTS}
<link rel="stylesheet" href="/css/style.css">
<link rel="icon" type="image/png" href="${FAVICON}">
<link rel="apple-touch-icon" href="/images/marca/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(site.name)}">
</head>
<body class="${esc(opts.bodyClass || '')}">
<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
${promoBanner(ctx)}
${header()}
<main id="conteudo">
${opts.content}
</main>
${footer(ctx)}
${floatDock()}
${opts.leadPopup === false ? '' : leadPopup()}
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Imagem ampliada" hidden>
  <button class="lightbox-close" id="lightbox-close" type="button" aria-label="Fechar">✕</button>
  <img id="lightbox-img" alt="">
</div>
<script src="/js/main.js" defer></script>
</body>
</html>`;
}

/**
 * Pop-up de cadastro ("clube dos alpinistas"). Vai fechado no HTML; o
 * js/main.js abre ao entrar no site e envia para /api/leads (source "popup"),
 * que grava em leads e visitors.
 */
function leadPopup() {
  return `<dialog class="lead-popup" id="popup" aria-labelledby="popup-title" aria-describedby="popup-text">
  <form class="lead-popup-card" id="popup-form" novalidate>
    <button type="button" class="lead-popup-close" data-popup-close aria-label="Fechar">✕</button>
    <p class="eyebrow"><span class="rule"></span>Clube dos alpinistas</p>
    <h2 id="popup-title">Entre para o <em>clube ${esc(site.name)}.</em></h2>
    <p class="lead-popup-text" id="popup-text">Cadastre-se para receber novidades, lançamentos e ofertas do catálogo em primeira mão.</p>
    <div class="admin-msg admin-msg-success" id="popup-success" role="status" hidden>Cadastro feito! Bem-vindo ao clube, alpinista.</div>
    <div class="admin-msg admin-msg-error" id="popup-error" role="alert" hidden></div>
    <div id="popup-fields">
      <label class="field-label" for="popup-name">Nome</label>
      <div class="field-row"><input type="text" id="popup-name" name="name" autocomplete="name" maxlength="120" required></div>

      <label class="field-label" for="popup-email">E-mail</label>
      <div class="field-row"><input type="email" id="popup-email" name="email" autocomplete="email" maxlength="254" required></div>

      <label class="field-label" for="popup-instagram">Instagram (opcional)</label>
      <div class="field-row field-row-prefix"><span aria-hidden="true">@</span><input type="text" id="popup-instagram" name="instagram" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="60" placeholder="seuperfil"></div>

      <!-- honeypot: hidden from real people, only bots tend to fill this in -->
      <div class="hp-field" aria-hidden="true">
        <label for="popup-website">Não preencha este campo</label>
        <input type="text" id="popup-website" name="website" tabindex="-1" autocomplete="off">
      </div>

      <label class="consent" for="popup-consent">
        <input type="checkbox" id="popup-consent" name="consent" required>
        <span>Quero receber novidades da ${esc(site.name)} por e-mail ou pelo Instagram e concordo com o <a href="/privacidade" target="_blank" rel="noopener">aviso de privacidade</a>. Posso pedir a remoção dos meus dados quando quiser.</span>
      </label>

      <button type="submit" class="btn btn-dark btn-block" id="popup-submit">Quero participar</button>
      <button type="button" class="lead-popup-later" data-popup-close>Agora não</button>
    </div>
  </form>
</dialog>`;
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
