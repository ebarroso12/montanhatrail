const db = require('../../db');
const { id: toId } = require('../../validate');
const { sendCsv } = require('../../csv');

function toVisitor(row) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    instagram: row.instagram,
    firstSource: row.first_source,
    lastSource: row.last_source,
    signups: row.signups,
    consentVersion: row.consent_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Protected (enforced by the admin router): visitantes cadastrados — um por
 * e-mail, somando pop-up e formulário. Excluir apaga o visitante e todos os
 * leads do mesmo e-mail (pedido de remoção dos dados, LGPD).
 */
module.exports = async (req, res) => {
  if (req.method === 'GET' && req.query.format === 'csv') {
    const all = await db.query(
      `SELECT updated_at, created_at, name, email, instagram, signups, first_source, last_source, consent_at, consent_version
       FROM visitors ORDER BY updated_at DESC LIMIT 50000`
    );
    const origin = (s) => (s === 'popup' ? 'Pop-up' : 'Formulário do site');
    sendCsv(
      res,
      'alpins-visitantes',
      ['Último cadastro', 'Primeiro cadastro', 'Nome', 'E-mail', 'Instagram', 'Cadastros', 'Primeira origem', 'Última origem', 'Consentimento em', 'Versão do aviso'],
      all.rows.map((r) => [r.updated_at, r.created_at, r.name, r.email, r.instagram ? `https://instagram.com/${r.instagram}` : '', r.signups, origin(r.first_source), origin(r.last_source), r.consent_at, r.consent_version])
    );
    return;
  }

  if (req.method === 'GET') {
    const result = await db.query(
      `SELECT id, name, email, instagram, first_source, last_source, signups, consent_version, created_at, updated_at,
              count(*) OVER() AS total_count
       FROM visitors
       ORDER BY updated_at DESC
       LIMIT 500`
    );
    const total = result.rows.length ? Number(result.rows[0].total_count) : 0;
    res.status(200).json({ total, visitors: result.rows.map(toVisitor) });
    return;
  }

  if (req.method === 'DELETE') {
    const id = toId(req.query.id);
    if (!id) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const removed = await db.transaction(async (client) => {
      const visitor = await client.query('DELETE FROM visitors WHERE id = $1 RETURNING email', [id]);
      if (!visitor.rows[0]) return null;
      const leads = await client.query('DELETE FROM leads WHERE lower(email) = $1', [visitor.rows[0].email]);
      return { leads: leads.rowCount };
    });
    if (!removed) {
      res.status(404).json({ error: 'not_found', message: 'Visitante não encontrado.' });
      return;
    }
    res.status(200).json({ ok: true, leadsRemoved: removed.leads });
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
