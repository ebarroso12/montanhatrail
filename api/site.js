const catalog = require('./_lib/catalog');
const pages = require('./_lib/views/pages');
const adminViews = require('./_lib/views/admin');
const { esc } = require('./_lib/views/layout');
const { getSessionAdmin } = require('./_lib/auth');
const { CACHE, sendHtml, sendText, redirect } = require('./_lib/http');
const { SLUG_RE } = require('./_lib/validate');
const site = require('./_lib/site');

/**
 * Server-rendered pages (vercel.json rewrites /, /catalogo, /categoria/:slug,
 * /produto/:slug, /sitemap.xml, /robots.txt and /admin here). Rendering on
 * the server gives every product real HTML + meta tags for SEO with almost
 * no JavaScript, and the CDN caches the public pages for a minute.
 */

const PAGE_SIZE = 24;

function pageNumber(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}

async function publicContext(req) {
  const ctx = { base: site.siteUrl(req), content: await catalog.getContent(), categories: [] };
  try {
    ctx.categories = await catalog.listCategories();
  } catch (err) {
    console.error('[site] catálogo indisponível:', err && err.message);
    ctx.catalogError = err;
  }
  return ctx;
}

function sendNotFound(res, ctx, privateCache) {
  sendHtml(res, 404, pages.notFound(ctx), privateCache ? CACHE.private : CACHE.notFound);
}

const PUBLIC_PAGES = {
  async home(req, res, ctx) {
    let featured = [];
    let latest = { items: [], total: 0 };
    if (!ctx.catalogError) {
      try {
        featured = (await catalog.listProducts({ featured: true, limit: 8 })).items;
        latest = await catalog.listProducts({ limit: 12 });
      } catch (err) {
        ctx.catalogError = err;
      }
    }
    // Home still renders (brand, contact, form) when the catalog is down.
    sendHtml(res, 200, pages.home(ctx, { featured, latest }), ctx.catalogError ? CACHE.notFound : CACHE.page);
  },

  async catalogo(req, res, ctx) {
    if (ctx.catalogError) throw ctx.catalogError;
    const search = String(req.query.q || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const page = pageNumber(req.query.pagina);
    const result = await catalog.listProducts({ search, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    sendHtml(res, 200, pages.listing(ctx, { search, page, pageSize: PAGE_SIZE, result }), CACHE.page);
  },

  async categoria(req, res, ctx) {
    if (ctx.catalogError) throw ctx.catalogError;
    const slug = String(req.query.slug || '');
    const category = SLUG_RE.test(slug) ? await catalog.getCategoryBySlug(slug) : null;
    if (!category) {
      sendNotFound(res, ctx);
      return;
    }
    const page = pageNumber(req.query.pagina);
    const result = await catalog.listProducts({ categoryId: category.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    sendHtml(res, 200, pages.listing(ctx, { category, page, pageSize: PAGE_SIZE, result }), CACHE.page);
  },

  async produto(req, res, ctx) {
    if (ctx.catalogError) throw ctx.catalogError;
    const slug = String(req.query.slug || '');
    // ?preview=1 lets a logged-in admin see an inactive product before publishing.
    const wantsPreview = req.query.preview === '1';
    const isAdmin = wantsPreview && !!(await getSessionAdmin(req));
    const product = SLUG_RE.test(slug) ? await catalog.getProductBySlug(slug, { includeInactive: isAdmin }) : null;
    if (!product) {
      sendNotFound(res, ctx, wantsPreview);
      return;
    }
    const related = await catalog.listRelated(product, 4);
    const preview = isAdmin && !(product.active && product.category.active);
    sendHtml(res, 200, pages.product(ctx, { product, related, preview }), wantsPreview ? CACHE.private : CACHE.page);
  },
};

const OTHER_PAGES = {
  async sitemap(req, res) {
    const base = site.siteUrl(req);
    const { products, categories } = await catalog.sitemapEntries();
    const urls = [{ loc: '/' }, { loc: '/catalogo' }]
      .concat(categories.map((c) => ({ loc: `/categoria/${c.slug}`, lastmod: c.updated_at })))
      .concat(products.map((p) => ({ loc: `/produto/${p.slug}`, lastmod: p.updated_at })));
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${esc(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}</url>`
  )
  .join('\n')}
</urlset>
`;
    sendText(res, 200, xml, 'application/xml; charset=utf-8', CACHE.page);
  },

  async robots(req, res) {
    const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${site.siteUrl(req)}/sitemap.xml
`;
    sendText(res, 200, body, 'text/plain; charset=utf-8', CACHE.page);
  },

  async admin(req, res) {
    // The panel HTML itself is only served to a valid session.
    if (!(await getSessionAdmin(req))) {
      redirect(res, '/admin/login');
      return;
    }
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    sendHtml(res, 200, adminViews.dashboard(), CACHE.private);
  },

  async 'admin-login'(req, res) {
    if (await getSessionAdmin(req)) {
      redirect(res, '/admin');
      return;
    }
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    sendHtml(res, 200, adminViews.login(), CACHE.private);
  },
};

module.exports = async (req, res) => {
  const name = String(req.query.page || '');
  try {
    if (Object.prototype.hasOwnProperty.call(OTHER_PAGES, name)) {
      await OTHER_PAGES[name](req, res);
      return;
    }
    const ctx = await publicContext(req);
    if (Object.prototype.hasOwnProperty.call(PUBLIC_PAGES, name)) {
      await PUBLIC_PAGES[name](req, res, ctx);
    } else {
      sendNotFound(res, ctx);
    }
  } catch (err) {
    console.error('[site] erro:', err && err.message);
    if (res.headersSent) return;
    const ctx = { base: site.siteUrl(req), content: Object.assign({}, site.contentDefaults), categories: [] };
    sendHtml(res, 503, pages.unavailable(ctx), CACHE.private);
  }
};
