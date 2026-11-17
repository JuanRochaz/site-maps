// prospectar.mjs — Busca empresas de uma região no Google Maps e lista as que NÃO têm site
// Uso:
//   node scripts/prospectar.mjs "Sertãozinho SP"
//   node scripts/prospectar.mjs "Ribeirão Preto SP" --nichos barbearia,oficina --min-avaliacoes 20
//   node scripts/prospectar.mjs "Sertãozinho SP" --termos "pet shop,autoescola"
// Opções:
//   --nichos a,b          nichos a buscar (padrão: todos)
//   --termos "x,y"        termos extras de busca (o nicho é deduzido pelo tipo do Google)
//   --min-avaliacoes N    mínimo de avaliações no Google (padrão 5)
//   --min-nota N          nota mínima (padrão 4.0)
//   --paginas N           páginas de 20 resultados por termo, 1 a 3 (padrão 2)
//   --incluir-com-site    também lista quem já tem site próprio (marcado como "tem site")
// Saída: prospeccao/<regiao>-<data>/lista.csv (abre no Excel), lista.json e resumo no terminal.
// Requer GOOGLE_PLACES_API_KEY no .env.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregarEnv, places, slugify, sugerirNicho, whatsappDe } from './coletar.mjs';
import { verificar } from './uso.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Termos de busca por nicho (o que a pessoa digitaria no Maps)
export const TERMOS = {
  barbearia: ['barbearia', 'salão de beleza'],
  oficina: ['oficina mecânica', 'auto center', 'funilaria e pintura', 'auto elétrica'],
  clinica: ['clínica odontológica', 'fisioterapia', 'clínica de estética', 'clínica veterinária'],
  restaurante: ['restaurante', 'pizzaria', 'lanchonete', 'padaria'],
  geral: ['escritório de contabilidade', 'advogado', 'imobiliária'],
};

const REDES = /(instagram\.com|facebook\.com|fb\.com|fb\.me|linktr\.ee|linktree|wa\.me|whatsapp\.com|api\.whatsapp|tiktok\.com|youtube\.com|ifood\.com|goo\.gl|g\.page|business\.site|bio\.link|beacons\.ai)/i;

/** 'sem site' | 'só rede social' | 'tem site' */
export function classificarSite(url) {
  if (!url) return 'sem site';
  return REDES.test(url) ? 'só rede social' : 'tem site';
}

/** Pontuação para ordenar a lista: boa reputação + muitas avaliações + WhatsApp = melhor alvo */
export function pontuar({ nota, avaliacoes, whatsapp, situacaoSite }) {
  let p = 0;
  p += Math.max(0, (nota || 0) - 3.5) * 40;               // nota 5.0 → 60 pts; 4.0 → 20
  p += Math.min(Math.log10((avaliacoes || 0) + 1) * 20, 50); // 10 aval. → 20; 100 → 40; 300+ → 50
  if (whatsapp) p += 15;                                   // abordagem direta pelo WhatsApp
  if (situacaoSite === 'sem site') p += 10;
  if (situacaoSite === 'só rede social') p += 5;
  return Math.round(p);
}

/** O tipo principal do Google manda (ex.: salão feminino → clinica/estética, não barbearia);
 *  o nicho do termo de busca só entra quando o Google não diz nada específico. */
export function nichoPara(p, nichoBusca) {
  if (p.primaryType) {
    const n = sugerirNicho([p.primaryType]);
    if (n !== 'geral') return n;
  }
  const n = sugerirNicho(p.types || []);
  return n !== 'geral' ? n : (nichoBusca || 'geral');
}

function lerOpcoes(args) {
  const op = { regiao: '', nichos: Object.keys(TERMOS), termos: [], minAval: 5, minNota: 4.0, paginas: 2, comSite: false };
  const resto = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--nichos') op.nichos = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--termos') op.termos = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--min-avaliacoes') op.minAval = +args[++i];
    else if (a === '--min-nota') op.minNota = +args[++i];
    else if (a === '--paginas') op.paginas = Math.min(3, Math.max(1, +args[++i]));
    else if (a === '--incluir-com-site') op.comSite = true;
    else if (a === '--confirmar') { /* lido pelo uso.mjs */ }
    else resto.push(a);
  }
  op.regiao = resto.join(' ').trim();
  const invalidos = op.nichos.filter(n => !TERMOS[n]);
  if (invalidos.length) throw new Error(`Nicho inválido: ${invalidos.join(', ')}. Use: ${Object.keys(TERMOS).join(', ')}`);
  return op;
}

const CAMPOS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.websiteUri', 'places.rating',
  'places.userRatingCount', 'places.nationalPhoneNumber', 'places.businessStatus', 'places.primaryType',
  'places.primaryTypeDisplayName', 'places.types', 'places.googleMapsUri', 'nextPageToken',
].join(',');

async function buscarTermo(termo, regiao, paginas) {
  const lista = [];
  let pageToken;
  for (let i = 0; i < paginas; i++) {
    const r = await places('places:searchText', {
      method: 'POST', campos: CAMPOS,
      body: { textQuery: `${termo} em ${regiao}`, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20, ...(pageToken ? { pageToken } : {}) },
    });
    lista.push(...(r.places || []));
    pageToken = r.nextPageToken;
    if (!pageToken) break;
    await new Promise(ok => setTimeout(ok, 1500)); // o token da próxima página demora um pouco para valer
  }
  return lista;
}

const csvCampo = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function main() {
  await carregarEnv();
  if (!process.env.GOOGLE_PLACES_API_KEY) { console.error('ERRO: defina GOOGLE_PLACES_API_KEY no arquivo .env'); process.exit(1); }
  const op = lerOpcoes(process.argv.slice(2));
  if (!op.regiao) { console.error('Uso: node scripts/prospectar.mjs "<cidade UF>" [--nichos a,b] [--min-avaliacoes N]'); process.exit(1); }

  const buscas = [
    ...op.nichos.flatMap(n => TERMOS[n].map(t => ({ termo: t, nicho: n }))),
    ...op.termos.map(t => ({ termo: t, nicho: null })),
  ];
  console.log(`Região: ${op.regiao} | ${buscas.length} termos | até ${buscas.length * op.paginas} chamadas de Text Search`);
  await verificar({ busca: buscas.length * op.paginas });

  const porId = new Map();
  for (const { termo, nicho } of buscas) {
    try {
      const achados = await buscarTermo(termo, op.regiao, op.paginas);
      for (const p of achados) if (!porId.has(p.id)) porId.set(p.id, { p, termo, nichoBusca: nicho });
      console.log(`  ${termo}: ${achados.length}`);
    } catch (e) { console.log(`  ${termo}: ERRO ${e.message}`); }
  }

  // Filtra pela cidade do endereço (a busca às vezes traz vizinhas)
  const cidade = op.regiao.replace(/\s+[A-Z]{2}$/, '').trim().toLowerCase();
  const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const linhas = [];
  for (const { p, termo, nichoBusca } of porId.values()) {
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
    const situacaoSite = classificarSite(p.websiteUri);
    if (situacaoSite === 'tem site' && !op.comSite) continue;
    const nota = p.rating ?? null, avaliacoes = p.userRatingCount ?? 0;
    if (avaliacoes < op.minAval || (nota ?? 0) < op.minNota) continue;
    const endereco = p.formattedAddress || '';
    const naCidade = semAcento(endereco.toLowerCase()).includes(semAcento(cidade));
    const whatsapp = whatsappDe(p.nationalPhoneNumber);
    linhas.push({
      pontos: pontuar({ nota, avaliacoes, whatsapp, situacaoSite }),
      nome: p.displayName?.text || '',
      nicho: nichoPara(p, nichoBusca),
      categoria: p.primaryTypeDisplayName?.text || '',
      nota, avaliacoes,
      telefone: p.nationalPhoneNumber || '',
      whatsapp: whatsapp ? 'sim' : 'não',
      situacaoSite, siteAtual: p.websiteUri || '',
      naCidade: naCidade ? 'sim' : 'não',
      endereco, mapsUrl: p.googleMapsUri || '',
      placeId: p.id, termo,
      slug: slugify(p.displayName?.text || p.id),
    });
  }
  linhas.sort((a, b) => (b.naCidade === 'sim') - (a.naCidade === 'sim') || b.pontos - a.pontos);

  const data = new Date().toISOString().slice(0, 10);
  const pasta = path.join(RAIZ, 'prospeccao', `${slugify(op.regiao)}-${data}`);
  await fs.mkdir(pasta, { recursive: true });
  const cols = ['pontos', 'nome', 'nicho', 'categoria', 'nota', 'avaliacoes', 'telefone', 'whatsapp', 'situacaoSite', 'siteAtual', 'naCidade', 'endereco', 'mapsUrl', 'placeId', 'slug'];
  const csv = '﻿' + [cols.join(';'), ...linhas.map(l => cols.map(c => csvCampo(l[c])).join(';'))].join('\r\n');
  await fs.writeFile(path.join(pasta, 'lista.csv'), csv);
  await fs.writeFile(path.join(pasta, 'lista.json'), JSON.stringify({ regiao: op.regiao, data, opcoes: op, total: linhas.length, empresas: linhas }, null, 2));

  const rel = path.relative(RAIZ, pasta).replace(/\\/g, '/');
  console.log(`\n${porId.size} empresas encontradas → ${linhas.length} potenciais clientes`);
  console.log(`Lista: ${rel}/lista.csv\n`);
  console.log('Top 15:');
  for (const [i, l] of linhas.slice(0, 15).entries()) {
    console.log(`${String(i + 1).padStart(2)}. [${l.pontos}] ${l.nome} — ${l.nicho} — ${l.nota ?? '-'}★ (${l.avaliacoes}) — ${l.situacaoSite}${l.whatsapp === 'sim' ? ' — WhatsApp' : ''}${l.naCidade === 'não' ? ' — FORA DA CIDADE' : ''}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
}
