const db = require('../../db');
const { parseBody } = require('../../body');
const v = require('../../validate');
const storage = require('../../storage');
const { PRODUCT_COLUMNS, PRODUCT_FROM, IN_CATEGORY, toProduct } = require('../../catalog');

const PAGE_SIZE = 50;
const MAX_CATEGORIES = 30;

/** Validates the body; returns the product columns (in SQL order) and its category ids. */
function readProduct(body) {
  const name = v.text(body, 'name', { label: 'Nome', required: true, max: 120 });
  const categoryId = v.id(body.categoryId);
  if (!categoryId) throw new v.ValidationError('categoryId', 'Selecione a categoria principal.');

  // Categoria principal + "também aparece em" (sem repetição; a principal sempre entra).
  const extra = body.categoryIds == null ? [] : body.categoryIds;
  if (!Array.isArray(extra) || extra.length > MAX_CATEGORIES) {
    throw new v.ValidationError('categoryIds', `Selecione no máximo ${MAX_CATEGORIES} categorias.`);
  }
  const categoryIds = [categoryId];
  extra.forEach((raw) => {
    const id = v.id(raw);
    if (!id) throw new v.ValidationError('categoryIds', 'Categoria inválida. Recarregue a página e tente novamente.');
    if (!categoryIds.includes(id)) categoryIds.push(id);
  });

  const price = v.money(body, 'price', { label: 'Preço' });
  const salePrice = v.money(body, 'salePrice', { label: 'Preço promocional' });
  if (salePrice != null && price == null) {
    throw new v.ValidationError('salePrice', 'Para usar preço promocional, informe também o preço normal.');
  }
  if (salePrice != null && salePrice >= price) {
    throw new v.ValidationError('salePrice', 'O preço promocional precisa ser menor que o preço normal.');
  }

  return {
    categoryIds,
    values: [
      name,
      v.slug(body, 'slug', name),
      v.text(body, 'shortDescription', { label: 'Descrição curta', required: true, max: 300 }),
      v.text(body, 'description', { label: 'Descrição completa', max: 5000, multiline: true }),
      categoryId,
      v.imageUrl(body.mainImageUrl, 'mainImageUrl', 'Imagem principal'),
      v.imageList(body, 'galleryUrls', 12),
      price,
      salePrice,
      v.marketplaceUrl(body, 'shopeeUrl', 'shopee'),
      v.marketplaceUrl(body, 'mercadolivreUrl', 'mercadolivre'),
      v.bool(body, 'featured'),
      v.bool(body, 'active'),
      v.int(body, 'sortOrder', { label: 'Ordem', min: -100000, max: 100000, default: 0 }),
    ],
  };
}

async function setCategories(client, productId, categoryIds) {
  await client.query('DELETE FROM product_categories WHERE product_id = $1', [productId]);
  await client.query(
    'INSERT INTO product_categories (product_id, category_id) SELECT $1, unnest($2::bigint[])',
    [productId, categoryIds]
  );
}

async function findById(id) {
  const result = await db.query(`SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM} WHERE p.id = $1`, [id]);
  return result.rows[0] ? toProduct(result.rows[0]) : null;
}

function imagesOf(product) {
  return [product.mainImageUrl].concat(product.galleryUrls).filter(Boolean);
}

/** Deletes uploaded files no longer referenced by any product (best effort). */
async function cleanupImages(candidates) {
  try {
    await removeUnusedImages(candidates);
  } catch (err) {
    // The product was already saved/deleted; a cleanup failure must not turn that into an error.
    console.error('[products] limpeza de imagens falhou:', err && err.message);
  }
}

async function removeUnusedImages(candidates) {
  const unique = Array.from(new Set(candidates.filter(Boolean)));
  if (!unique.length) return;
  const stillUsed = await db.query(
    `SELECT main_image_url AS url FROM products WHERE main_image_url = ANY($1::text[])
     UNION SELECT unnest(gallery_urls) FROM products WHERE gallery_urls && $1::text[]`,
    [unique]
  );
  const used = new Set(stillUsed.rows.map((r) => r.url));
  await storage.removeImages(unique.filter((url) => !used.has(url)));
}

async function list(req, res) {
  const where = [];
  const params = [];
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.slug ILIKE $${params.length})`);
  }
  const categoryId = v.id(req.query.categoryId);
  if (categoryId) {
    params.push(categoryId);
    where.push(IN_CATEGORY(`$${params.length}`));
  }
  const status = String(req.query.status || '');
  if (status === 'active') where.push('p.active');
  if (status === 'inactive') where.push('NOT p.active');
  if (status === 'featured') where.push('p.featured');

  const page = Math.max(1, Math.min(1000, parseInt(req.query.page, 10) || 1));
  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const result = await db.query(
    `SELECT ${PRODUCT_COLUMNS}, count(*) OVER() AS total_count ${PRODUCT_FROM}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = result.rows.length ? Number(result.rows[0].total_count) : 0;
  res.status(200).json({
    products: result.rows.map(toProduct),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
}

/** Protected (enforced by the admin router): CRUD of products. */
module.exports = async (req, res) => {
  const id = v.id(req.query.id);

  if (req.method === 'GET') {
    if (req.query.id) {
      const product = id ? await findById(id) : null;
      if (!product) {
        res.status(404).json({ error: 'not_found', message: 'Produto não encontrado.' });
        return;
      }
      res.status(200).json({ product });
      return;
    }
    await list(req, res);
    return;
  }

  if (req.method === 'POST') {
    const data = readProduct(parseBody(req));
    const newId = await db.transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO products
           (name, slug, short_description, description, category_id, main_image_url, gallery_urls,
            price, sale_price, shopee_url, mercadolivre_url, featured, active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        data.values
      );
      await setCategories(client, result.rows[0].id, data.categoryIds);
      return result.rows[0].id;
    });
    res.status(201).json({ product: await findById(newId) });
    return;
  }

  if (!id) {
    res.status(req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE' ? 400 : 405).json({
      error: req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE' ? 'invalid_id' : 'method_not_allowed',
    });
    return;
  }

  if (req.method === 'PUT') {
    const before = await findById(id);
    if (!before) {
      res.status(404).json({ error: 'not_found', message: 'Produto não encontrado.' });
      return;
    }
    const data = readProduct(parseBody(req));
    await db.transaction(async (client) => {
      await client.query(
        `UPDATE products SET
           name = $1, slug = $2, short_description = $3, description = $4, category_id = $5,
           main_image_url = $6, gallery_urls = $7, price = $8, sale_price = $9, shopee_url = $10,
           mercadolivre_url = $11, featured = $12, active = $13, sort_order = $14
         WHERE id = $15`,
        data.values.concat(id)
      );
      await setCategories(client, id, data.categoryIds);
    });
    const after = await findById(id);
    const kept = new Set(imagesOf(after));
    await cleanupImages(imagesOf(before).filter((url) => !kept.has(url)));
    res.status(200).json({ product: after });
    return;
  }

  if (req.method === 'PATCH') {
    // Quick toggles from the list (ativar/desativar, destaque).
    const body = parseBody(req);
    const sets = [];
    const params = [];
    ['active', 'featured'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        params.push(v.bool(body, field));
        sets.push(`${field} = $${params.length}`);
      }
    });
    if (!sets.length) {
      res.status(400).json({ error: 'validation', message: 'Nada para atualizar.' });
      return;
    }
    params.push(id);
    const result = await db.query(`UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`, params);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'not_found', message: 'Produto não encontrado.' });
      return;
    }
    res.status(200).json({ product: await findById(id) });
    return;
  }

  if (req.method === 'DELETE') {
    const before = await findById(id);
    if (!before) {
      res.status(404).json({ error: 'not_found', message: 'Produto não encontrado.' });
      return;
    }
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    await cleanupImages(imagesOf(before));
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
