// uso.mjs — conta as consultas pagas da Places API por mês e trava antes de passar do limite
// Ver o uso do mês:   node scripts/uso.mjs
// Arquivo: uso/AAAA-MM.json  (fora do Git)
//
// Tipos contados (cada um tem cota grátis própria no Google, ~1.000/mês nos campos que usamos):
//   busca    — Text Search com site/nota/telefone (prospectar.mjs)
//   detalhes — Place Details com avaliações (coletar.mjs)
//   fotos    — download de foto (coletar.mjs)
//   buscaId  — Text Search só com ID/nome (coletar.mjs por link/nome). Mais barata; só registrada.
// Limites de segurança (padrão 900) podem ser trocados no .env:
//   USO_LIMITE_BUSCA=900  USO_LIMITE_DETALHES=900  USO_LIMITE_FOTOS=900

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(RAIZ, 'uso');
export const TIPOS = ['busca', 'detalhes', 'fotos'];
const NOMES = { busca: 'buscas de prospecção', detalhes: 'detalhes de empresa', fotos: 'fotos', buscaId: 'buscas simples (nome/link)' };

const mesAtual = () => new Date().toISOString().slice(0, 7);
const arquivo = () => path.join(PASTA, `${mesAtual()}.json`);

export function limites() {
  const l = {};
  for (const t of TIPOS) l[t] = Number(process.env[`USO_LIMITE_${t.toUpperCase()}`]) || 900;
  return l;
}

export async function lerUso() {
  try { return JSON.parse(await fs.readFile(arquivo(), 'utf8')); }
  catch { return { mes: mesAtual(), busca: 0, detalhes: 0, fotos: 0, buscaId: 0 }; }
}

export async function registrar(tipo, n = 1) {
  const u = await lerUso();
  u[tipo] = (u[tipo] || 0) + n;
  u.atualizadoEm = new Date().toISOString();
  await fs.mkdir(PASTA, { recursive: true });
  await fs.writeFile(arquivo(), JSON.stringify(u, null, 2));
}

/**
 * Mostra o uso do mês e o que a execução vai gastar. Se algum tipo passar do limite,
 * encerra o script (código 2) — a menos que tenha vindo --confirmar.
 * @param {{busca?:number, detalhes?:number, fotos?:number}} previsto  máximo que esta execução pode gastar
 */
export async function verificar(previsto, confirmado = process.argv.includes('--confirmar')) {
  const u = await lerUso(), lim = limites();
  const estouro = [];
  const partes = [];
  for (const t of TIPOS) {
    const p = previsto[t] || 0;
    if (!p) continue;
    const depois = (u[t] || 0) + p;
    partes.push(`${NOMES[t]}: ${u[t] || 0} + até ${p} = ${depois}/${lim[t]}`);
    if (depois > lim[t]) estouro.push(`${NOMES[t]} (${depois} > ${lim[t]})`);
  }
  console.log(`Uso do mês ${u.mes || mesAtual()} → ${partes.join(' | ')}`);
  if (!estouro.length) return;
  if (confirmado) { console.log(`AVISO: passando do limite de segurança em ${estouro.join(', ')} (confirmado com --confirmar).`); return; }
  console.error(`\nLIMITE: esta execução pode passar do limite de segurança em ${estouro.join(', ')}.`);
  console.error('Acima da cota grátis do Google a consulta é cobrada (ou desconta do crédito do teste).');
  console.error('Nada foi consultado. Para rodar mesmo assim, repita o comando com --confirmar.');
  process.exit(2);
}

async function main() {
  const u = await lerUso(), lim = limites();
  console.log(`Uso da Places API em ${u.mes || mesAtual()} (contado pelo Site Maps):`);
  for (const t of TIPOS) {
    const pct = Math.round(((u[t] || 0) / lim[t]) * 100);
    console.log(`  ${NOMES[t].padEnd(26)} ${String(u[t] || 0).padStart(5)} / ${lim[t]}  (${pct}%)`);
  }
  console.log(`  ${NOMES.buscaId.padEnd(26)} ${String(u.buscaId || 0).padStart(5)}  (só registro)`);
  console.log('O Google pode contar um pouco diferente; o alerta de orçamento do Cloud é a referência final.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // lê só os USO_LIMITE_* do .env (sem importar o coletar.mjs, que importa este arquivo)
  try {
    for (const l of (await fs.readFile(path.join(RAIZ, '.env'), 'utf8')).split(/\r?\n/)) {
      const m = l.match(/^\s*(USO_LIMITE_[A-Z]+)\s*=\s*(\d+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* sem .env */ }
  await main();
}
