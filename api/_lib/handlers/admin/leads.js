const db = require('../../db');
const { requireAdmin } = require('../../auth');

/**
 * Protected: lists the most recent leads and deletes one on request
 * (LGPD — when someone asks for their data to be removed).
 */
module.exports = async (req, res) => {
  const adminId = req.adminId || (await requireAdmin(req, res));
  if (!adminId) return;

  if (req.method === 'GET') {
    const result = await db.query(
      'SELECT id, name, email, source, created_at FROM leads ORDER BY created_at DESC LIMIT 500'
    );
    res.status(200).json({ leads: result.rows || [] });
    return;
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const result = await db.query('DELETE FROM leads WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'not_found', message: 'Cadastro não encontrado.' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
