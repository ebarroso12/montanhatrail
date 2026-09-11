#!/usr/bin/env node
/**
 * Checagem rápida, sem dependências (o projeto não tem build step):
 *  - sintaxe de todos os arquivos .js
 *  - vercel.json válido e apontando só para funções que existem
 *  - cada função em /api carrega e exporta um handler
 *  - quantidade de funções serverless (plano Hobby da Vercel tem limite)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', '.vercel', 'images']);
const problems = [];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = walk(root, []);
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    problems.push(`sintaxe: ${path.relative(root, file)}\n${err.stderr}`);
  }
}

try {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  (config.rewrites || []).forEach((rule) => {
    const target = rule.destination.split('?')[0];
    if (target.startsWith('/api/') && !fs.existsSync(path.join(root, `${target}.js`))) {
      problems.push(`vercel.json aponta para função inexistente: ${target}`);
    }
  });
} catch (err) {
  problems.push(`vercel.json inválido: ${err.message}`);
}

const functions = fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
for (const fn of functions) {
  try {
    const handler = require(path.join(root, 'api', fn));
    if (typeof handler !== 'function') throw new Error('não exporta uma função');
  } catch (err) {
    problems.push(`api/${fn}: ${err.message}`);
  }
}

problems.forEach((p) => console.error(`✗ ${p}`));
console.log(`${problems.length ? '✗' : '✓'} ${files.length} arquivos .js verificados, ${functions.length} funções serverless, ${problems.length} problema(s).`);
process.exit(problems.length ? 1 : 0);
