const db = require('../../db');
const { parseBody } = require('../../body');
const v = require('../../validate');

function toCategory(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    active: row.active,
    sortOrder: row.sort_order,
    productCount: row.product_count == null ? 0 : row.product_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readCategory(body) {
  const name = v.text(body, 'name', { label: 'Nome', required: true, max: 80 });
  return [
    name,
    v.slug(body, 'slug', name),
    v.text(body, 'description', { label: 'Descrição', max: 300 }),
    v.bool(body, 'active'),
    v.int(body, 'sortOrder', { label: 'Ordem', min: -100000, max: 100000, default: 0 }),
  ];
}

async function reorder(body, res) {
  const ids = Array.isArray(body.ids) ? body.ids.map(v.id) : [];
  if (!ids.length || ids.length > 500 || ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    res.status(400).json({ error: 'validation', message: 'Ordem inválida.' });
    return;
  }
  await db.transaction(async (client) => {
    for (let i = 0; i < ids.length; i++) {
      await client.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [(i + 1) * 10, ids[i]]);
    }
  });
  res.status(200).json({ ok: true });
}

/** Protected (enforced by the admin router): CRUD + ordering of categories. */
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const result = await db.query(
      `SELECT c.*,
         (SELECT count(*)::int FROM products p
           WHERE p.category_id = c.id
              OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = c.id)) AS product_count
       FROM categories c
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    res.status(200).json({ categories: result.rows.map(toCategory) });
    return;
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    if (body.action === 'reorder') {
      await reorder(body, res);
      return;
    }
    const result = await db.query(
      `INSERT INTO categories (name, slug, description, active, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      readCategory(body)
    );
    res.status(201).json({ category: toCategory(result.rows[0]) });
    return;
  }

  const id = v.id(req.query.id);

  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (!id) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const body = parseBody(req);
    let result;
    if (req.method === 'PATCH') {
      // Quick toggle from the list: only the active flag.
      result = await db.query('UPDATE categories SET active = $1 WHERE id = $2 RETURNING *', [v.bool(body, 'active'), id]);
    } else {
      result = await db.query(
        `UPDATE categories SET name = $1, slug = $2, description = $3, active = $4, sort_order = $5
         WHERE id = $6 RETURNING *`,
        readCategory(body).concat(id)
      );
    }
    if (!result.rows[0]) {
      res.status(404).json({ error: 'not_found', message: 'Categoria não encontrada.' });
      return;
    }
    res.status(200).json({ category: toCategory(result.rows[0]) });
    return;
  }

  if (req.method === 'DELETE') {
    if (!id) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    // Conta produtos em que ela é a principal ou uma das categorias extras.
    const countResult = await db.query(
      `SELECT count(*)::int AS n FROM products p
       WHERE p.category_id = $1
          OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = $1)`,
      [id]
    );
    const n = countResult.rows[0].n;
    if (n > 0) {
      res.status(409).json({
        error: 'category_has_products',
        message: `Esta categoria está em ${n} produto(s). Tire essa categoria desses produtos (ou exclua-os) antes de excluí-la.`,
      });
      return;
    }
    const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'not_found', message: 'Categoria não encontrada.' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
