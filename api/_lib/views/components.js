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
  // Preço e nome viajam no botão para os eventos do pixel (js/main.js) poderem
  // mandar valor e produto junto com o clique — sem eles o evento chega vazio.
  const trackPrice = product.onSale ? product.salePrice : product.price;
  const trackAttrs =
    `data-track-product="${product.id}" data-track-name="${esc(product.name)}"` +
    (trackPrice != null ? ` data-track-price="${trackPrice}"` : '');
  const buttons = product.links
    .map(
      (link) =>
        `<a class="btn btn-market btn-${link.marketplace}" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer sponsored" ${trackAttrs} data-track-marketplace="${link.marketplace}" data-track-placement="${placement}">${labels[link.marketplace]} <span aria-hidden="true">↗</span><span class="sr-only"> (abre em nova aba)</span></a>`
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

// Grupos da barra de filtros (coluna categories.filter_group).
const FILTER_GROUPS = [
  { key: 'tipo', label: 'Tipo' },
  { key: 'publico', label: 'Para quem' },
  { key: 'estilo', label: 'Estilo' },
];

/**
 * Barra de filtros do catálogo: uma linha por grupo; cada botão liga ou
 * desliga o filtro daquele grupo mantendo os outros (e a busca, se houver).
 * `selected` = { tipo?: categoria, publico?: categoria, estilo?: categoria }.
 */
function filterBar(categories, selected, search) {
  const sel = selected || {};
  const groups = FILTER_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    items: categories.filter((cat) => (cat.group || 'tipo') === g.key),
  })).filter((g) => g.items.length);
  if (!groups.length) return '';

  const href = (groupKey, slug) => {
    const query = new URLSearchParams();
    if (search) query.set('q', search);
    FILTER_GROUPS.forEach((g) => {
      const current = sel[g.key] ? sel[g.key].slug : '';
      const value = g.key === groupKey ? (current === slug ? '' : slug) : current;
      if (value) query.set(g.key, value);
    });
    const qs = query.toString();
    return esc(`/catalogo${qs ? `?${qs}` : ''}`);
  };
  const anyActive = FILTER_GROUPS.some((g) => sel[g.key]);

  return `<nav class="filter-bar" aria-label="Filtrar produtos">
  ${groups
    .map(
      (g) => `<div class="filter-group" role="group" aria-label="${esc(g.label)}">
    <span class="filter-label">${esc(g.label)}</span>
    <div class="chip-row">${g.items
      .map((cat) => {
        const active = !!sel[g.key] && sel[g.key].slug === cat.slug;
        return `<a class="chip${active ? ' is-active' : ''}" href="${href(g.key, cat.slug)}"${active ? ' aria-current="true"' : ''}>${esc(cat.name)}${
          active ? ' <span aria-hidden="true">✕</span><span class="sr-only"> (remover filtro)</span>' : ''
        }</a>`;
      })
      .join('')}</div>
  </div>`
    )
    .join('')}
  ${anyActive || search ? '<a class="filter-clear" href="/catalogo">Limpar filtros</a>' : ''}
</nav>`;
}

/** Cartões de categoria agrupados por Tipo / Para quem / Estilo (home). */
function categoryGroups(categories) {
  return FILTER_GROUPS.map((g) => {
    const items = categories.filter((cat) => (cat.group || 'tipo') === g.key);
    if (!items.length) return '';
    return `<div class="category-group">
  <h3 class="category-group-title">${esc(g.label)}</h3>
  ${categoryCards(items)}
</div>`;
  }).join('');
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
  FILTER_GROUPS,
  filterBar,
  categoryCards,
  categoryGroups,
  searchForm,
  pagination,
  emptyState,
  richText,
};
