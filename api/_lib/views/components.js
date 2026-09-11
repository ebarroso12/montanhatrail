const { esc, formatPrice, MOUNTAIN_PATH } = require('./layout');

const PLACEHOLDER = `<span class="img-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="${MOUNTAIN_PATH}" fill="currentColor"/></svg></span>`;

function productImage(src, alt, eager) {
  if (!src) return PLACEHOLDER;
  return `<img src="${esc(src)}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
}

function price(product, size) {
  const cls = `price${size ? ` price-${size}` : ''}`;
  if (product.onSale) {
    return `<p class="${cls}"><s class="price-old"><span class="sr-only">De </span>${esc(formatPrice(product.price))}</s> <strong class="price-now"><span class="sr-only">por </span>${esc(formatPrice(product.salePrice))}</strong></p>`;
  }
  if (product.price != null) {
    return `<p class="${cls}"><strong class="price-now">${esc(formatPrice(product.price))}</strong></p>`;
  }
  return '';
}

const BUTTON_LABELS = {
  card: { shopee: 'Shopee', mercadolivre: 'Mercado Livre' },
  produto: { shopee: 'Comprar na Shopee', mercadolivre: 'Comprar no Mercado Livre' },
};

/** One button per marketplace link that actually exists — never an empty button. */
function marketplaceButtons(product, placement) {
  if (!product.links.length) return '';
  const labels = BUTTON_LABELS[placement] || BUTTON_LABELS.card;
  const buttons = product.links
    .map(
      (link) =>
        `<a class="btn btn-market btn-${link.marketplace}" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer sponsored" data-track-product="${product.id}" data-track-marketplace="${link.marketplace}" data-track-placement="${placement}">${labels[link.marketplace]} <span aria-hidden="true">↗</span><span class="sr-only"> (abre em nova aba)</span></a>`
    )
    .join('');
  return `<div class="market-actions market-actions-${placement}">${buttons}</div>`;
}

function productCard(product, opts) {
  const url = `/produto/${esc(product.slug)}`;
  const eager = !!(opts && opts.eager);
  return `<article class="product-card">
  <a class="product-media" href="${url}" tabindex="-1" aria-hidden="true">
    ${productImage(product.mainImageUrl, product.name, eager)}
    ${product.onSale ? `<span class="badge badge-sale">−${product.discountPercent}%</span>` : ''}
  </a>
  <div class="product-body">
    <a class="product-category" href="/categoria/${esc(product.category.slug)}">${esc(product.category.name)}</a>
    <h3 class="product-name"><a href="${url}">${esc(product.name)}</a></h3>
    ${product.onSale ? '<span class="promo-tag">Promoção</span>' : ''}
    ${price(product)}
    ${marketplaceButtons(product, 'card')}
    <a class="product-details" href="${url}">Ver detalhes <span aria-hidden="true">→</span><span class="sr-only"> de ${esc(product.name)}</span></a>
  </div>
</article>`;
}

function productGrid(products, opts) {
  return `<div class="product-grid">${products.map((p) => productCard(p, opts)).join('')}</div>`;
}

function categoryChips(categories, activeSlug) {
  if (!categories.length) return '';
  const chip = (href, label, active, count) =>
    `<a class="chip${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}${
      count != null ? ` <span class="chip-count">${count}</span>` : ''
    }</a>`;
  return `<nav class="chip-row" aria-label="Filtrar por categoria">${chip('/catalogo', 'Todos', !activeSlug)}${categories
    .map((c) => chip(`/categoria/${esc(c.slug)}`, esc(c.name), c.slug === activeSlug, c.productCount))
    .join('')}</nav>`;
}

function categoryCards(categories) {
  return `<ul class="category-grid">${categories
    .map(
      (c) => `<li><a class="category-card" href="/categoria/${esc(c.slug)}">
      <span class="category-name">${esc(c.name)}</span>
      ${c.description ? `<span class="category-desc">${esc(c.description)}</span>` : ''}
      <span class="category-count">${c.productCount} ${c.productCount === 1 ? 'produto' : 'produtos'} <span aria-hidden="true">→</span></span>
    </a></li>`
    )
    .join('')}</ul>`;
}

function searchForm(value) {
  return `<form class="search-form" action="/catalogo" method="get" role="search">
  <label class="sr-only" for="busca">Buscar produtos</label>
  <input id="busca" name="q" type="search" placeholder="Buscar produtos" maxlength="80" value="${esc(value || '')}">
  <button class="btn btn-dark btn-sm" type="submit">Buscar</button>
</form>`;
}

function pagination(basePath, page, totalPages, params) {
  if (totalPages <= 1) return '';
  const href = (n) => {
    const query = new URLSearchParams(params || {});
    if (n > 1) query.set('pagina', String(n));
    const qs = query.toString();
    return esc(basePath + (qs ? `?${qs}` : ''));
  };
  return `<nav class="pagination" aria-label="Paginação">
  ${page > 1 ? `<a class="btn btn-outline-dark btn-sm" href="${href(page - 1)}" rel="prev">← Anterior</a>` : '<span></span>'}
  <span class="pagination-status">Página ${page} de ${totalPages}</span>
  ${page < totalPages ? `<a class="btn btn-outline-dark btn-sm" href="${href(page + 1)}" rel="next">Próxima →</a>` : '<span></span>'}
</nav>`;
}

function emptyState(title, text, actionHtml) {
  return `<div class="empty-state">
  <span class="empty-icon" aria-hidden="true">${PLACEHOLDER}</span>
  <h3>${title}</h3>
  <p>${text}</p>
  ${actionHtml || ''}
</div>`;
}

/** Plain text from the admin → paragraphs; blank line = new paragraph, newline = <br>. */
function richText(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.split('\n').map(esc).join('<br>')}</p>`)
    .join('');
}

module.exports = {
  PLACEHOLDER,
  price,
  marketplaceButtons,
  productCard,
  productGrid,
  categoryChips,
  categoryCards,
  searchForm,
  pagination,
  emptyState,
  richText,
};
