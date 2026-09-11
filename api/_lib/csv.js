/**
 * Exportação CSV para abrir direto no Excel em português: separador ";",
 * BOM UTF-8 (acentos corretos) e proteção contra fórmulas (células que
 * começam com = + - @ viram texto).
 */

const BOM = String.fromCharCode(0xfeff);

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function cell(value) {
  let text = value == null ? '' : value instanceof Date ? formatDate(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  return BOM + [headers].concat(rows).map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n';
}

function sendCsv(res, baseName, headers, rows) {
  const day = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}-${day}.csv"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(toCsv(headers, rows));
}

module.exports = { toCsv, sendCsv, formatDate };
