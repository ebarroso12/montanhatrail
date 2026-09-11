const db = require('./db');
const site = require('./site');

/**
 * Read-side of the catalog shared by the public pages and the admin API.
 * Public queries only ever return active products from active categories.
 */

const PRODUCT_COLUMNS = `
  p.id, p.name, p.slug, p.short_description, p.description, p.category_id,
  p.main_image_url, p.gallery_urls, p.price, p.sale_price, p.shopee_url,
  p.mercadolivre_url, p.featured, p.active, p.sort_order, p.created_at, p.updated_at,
  c.name AS category_name, c.slug AS category_slug, c.active AS category_active`;

const PRODUCT_FROM = 'FROM products p JOIN categories c ON c.id = p.category_id';

function toNumber(value) {
  return value == null ? null : Number(value);
}

function toProduct(row) {
  const price = toNumber(row.price);
  const salePrice = toNumber(row.sale_price);
  const onSale = price != null && salePrice != null && salePrice < price;
  const links = [];
  if (row.shopee_url) links.push({ marketplace: 'shopee', label: 'Shopee', url: row.shopee_url });
  if (row.mercadolivre_url) links.push({ marketplace: 'mercadolivre', label: 'Mercado Livre', url: row.mercadolivre_url });

  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description || '',
    description: row.description || '',
    categoryId: Number(row.category_id),
    category: {
      id: Number(row.category_id),
      name: row.category_name,
      slug: row.category_slug,
      active: row.category_active,
    },
    mainImageUrl: row.main_image_url || null,
    galleryUrls: Array.isArray(row.gallery_urls) ? row.gallery_urls : [],
    price,
    salePrice,
    onSale,
    discountPercent: onSale ? Math.round((1 - salePrice / price) * 100) : 0,
    shopeeUrl: row.shopee_url || null,
    mercadolivreUrl: row.mercadolivre_url || null,
    links,
    featured: row.featured,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Active categories that have at least one active product, with counts. */
async function listCategories() {
  const result = await db.query(
    `SELECT c.id, c.name, c.slug, c.description, count(p.id)::int AS product_count
     FROM categories c
     JOIN products p ON p.category_id = c.id AND p.active
     WHERE c.active
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    productCount: row.product_count,
  }));
}

async function getCategoryBySlug(slug) {
  const result = await db.query(
    'SELECT id, name, slug, description FROM categories WHERE slug = $1 AND active',
    [slug]
  );
  const row = result.rows[0];
  return row ? { id: Number(row.id), name: row.name, slug: row.slug, description: row.description || '' } : null;
}

async function listProducts(options) {
  const { categoryId, featured, search, limit, offset } = options || {};
  const where = ['p.active', 'c.active'];
  const params = [];
  if (categoryId) {
    params.push(categoryId);
    where.push(`p.category_id = $${params.length}`);
  }
  if (featured) where.push('p.featured');
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.short_description ILIKE $${params.length})`);
  }
  params.push(limit || 24, offset || 0);

  const result = await db.query(
    `SELECT ${PRODUCT_COLUMNS}, count(*) OVER() AS total_count
     ${PRODUCT_FROM}
     WHERE ${where.join(' AND ')}
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    items: result.rows.map(toProduct),
    total: result.rows.length ? Number(result.rows[0].total_count) : 0,
  };
}

async function getProductBySlug(slug, options) {
  const includeInactive = !!(options && options.includeInactive);
  const result = await db.query(
    `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM}
     WHERE p.slug = $1 ${includeInactive ? '' : 'AND p.active AND c.active'}`,
    [slug]
  );
  return result.rows[0] ? toProduct(result.rows[0]) : null;
}

async function listRelated(product, limit) {
  const result = await db.query(
    `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM}
     WHERE p.active AND c.active AND p.category_id = $1 AND p.id <> $2
     ORDER BY p.featured DESC, p.sort_order ASC, p.created_at DESC
     LIMIT $3`,
    [product.categoryId, product.id, limit || 4]
  );
  return result.rows.map(toProduct);
}

async function sitemapEntries() {
  const products = await db.query(
    `SELECT p.slug, p.updated_at ${PRODUCT_FROM} WHERE p.active AND c.active ORDER BY p.sort_order, p.id`
  );
  const categories = await db.query(
    `SELECT c.slug, max(p.updated_at) AS updated_at
     FROM categories c JOIN products p ON p.category_id = c.id AND p.active
     WHERE c.active GROUP BY c.id ORDER BY c.sort_order, c.id`
  );
  return { products: products.rows, categories: categories.rows };
}

/** Editable home texts merged over the brand defaults (empty value = default). */
async function getContent() {
  const content = Object.assign({}, site.contentDefaults, {
    promo_banner_enabled: 'false',
    promo_banner_text: '',
  });
  try {
    const result = await db.query('SELECT key, value FROM site_content');
    result.rows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(content, row.key) && row.value) content[row.key] = row.value;
    });
  } catch (err) {
    // keep defaults
  }
  return content;
}

module.exports = {
  PRODUCT_COLUMNS,
  PRODUCT_FROM,
  toProduct,
  listCategories,
  getCategoryBySlug,
  listProducts,
  getProductBySlug,
  listRelated,
  sitemapEntries,
  getContent,
};
