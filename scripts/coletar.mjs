// coletar.mjs — Link do Google Maps -> saida/<slug>/dados.json (+ fotos)
// Uso:
//   node scripts/coletar.mjs "<link do Google Maps>"
//   node scripts/coletar.mjs --busca "Barbearia do Zé Sertãozinho"
// Requer GOOGLE_PLACES_API_KEY no arquivo .env (Places API (New) ativada).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_FOTOS = 6;

// ---------- utilidades ----------
async function carregarEnv() {
  try {
    const txt = await fs.readFile(path.join(RAIZ, '.env'), 'utf8');
    for (const linha of txt.split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sem .env */ }
}

export function slugify(txt) {
  return txt.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 50);
}

async function resolverLink(url) {
  // Segue redirecionamentos (links curtos maps.app.goo.gl / goo.gl/maps)
  let atual = url;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(atual, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { atual = new URL(loc, atual).href; continue; }
    break;
  }
  return atual;
}

function lerLinkMaps(url) {
  const u = new URL(url);
  let nome = null, lat = null, lng = null;
  const mPlace = u.pathname.match(/\/place\/([^/]+)/);
  if (mPlace) nome = decodeURIComponent(mPlace[1].replace(/\+/g, ' '));
  if (!nome && u.searchParams.get('q')) nome = u.searchParams.get('q');
  if (!nome && u.searchParams.get('query')) nome = u.searchParams.get('query');
  const m3d = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);       // coordenada exata do local
  const mAt = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);            // centro do mapa
  if (m3d) { lat = +m3d[1]; lng = +m3d[2]; } else if (mAt) { lat = +mAt[1]; lng = +mAt[2]; }
  return { nome, lat, lng };
}

async function places(endpoint, { method = 'GET', body, campos }) {
  const r = await fetch(`https://places.googleapis.com/v1/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': campos,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Places API ${r.status}: ${JSON.stringify(json.error || json)}`);
  return json;
}

function sugerirNicho(tipos = []) {
  const t = tipos.join(' ');
  if (/barber|hair_care|hair_salon/.test(t)) return 'barbearia';
  if (/car_repair|auto_parts|car_wash|tire|car_dealer|motorcycle/.test(t)) return 'oficina';
  if (/restaurant|cafe|bakery|bar\b|meal_|pizza|food|ice_cream|steak|confection/.test(t)) return 'restaurante';
  if (/dentist|doctor|hospital|physiotherap|medical|health|clinic|spa|beauty_salon|skin_care|veterinar/.test(t)) return 'clinica';
  return 'geral';
}

function whatsappDe(telNacional) {
  if (!telNacional) return null;
  const d = telNacional.replace(/\D/g, '').replace(/^0/, '');
  // Celular BR: DDD (2) + 9 + 8 dígitos = 11 dígitos
  if (d.length === 11 && d[2] === '9') return `55${d}`;
  return null;
}

// ---------- principal ----------
async function main() {
  await carregarEnv();
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('ERRO: defina GOOGLE_PLACES_API_KEY no arquivo .env'); process.exit(1);
  }
  const args = process.argv.slice(2);
  let textQuery, lat, lng;
  if (args[0] === '--busca') {
    textQuery = args.slice(1).join(' ');
  } else if (args[0]) {
    const final = await resolverLink(args[0]);
    const info = lerLinkMaps(final);
    if (!info.nome) { console.error('Não consegui ler o nome no link:', final, '\nUse --busca "nome + cidade".'); process.exit(1); }
    textQuery = info.nome; lat = info.lat; lng = info.lng;
  } else {
    console.error('Uso: node scripts/coletar.mjs "<link do Maps>"  |  --busca "nome cidade"'); process.exit(1);
  }

  const busca = await places('places:searchText', {
    method: 'POST',
    campos: 'places.id,places.displayName,places.formattedAddress',
    body: {
      textQuery, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 3,
      ...(lat != null ? { locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 800 } } } : {}),
    },
  });
  if (!busca.places?.length) { console.error('Nenhuma empresa encontrada para:', textQuery); process.exit(1); }
  const id = busca.places[0].id;

  const p = await places(`places/${id}?languageCode=pt-BR&regionCode=BR`, {
    campos: [
      'id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'addressComponents', 'location',
      'nationalPhoneNumber', 'internationalPhoneNumber', 'regularOpeningHours', 'rating', 'userRatingCount',
      'reviews', 'photos', 'googleMapsUri', 'websiteUri', 'primaryType', 'primaryTypeDisplayName', 'types',
      'editorialSummary',
    ].join(','),
  });

  const nome = p.displayName?.text || textQuery;
  const slug = slugify(nome);
  const pasta = path.join(RAIZ, 'saida', slug);
  await fs.mkdir(path.join(pasta, 'img'), { recursive: true });

  // Fotos (somente para a DEMONSTRAÇÃO)
  const fotos = [];
  for (const [i, f] of (p.photos || []).slice(0, MAX_FOTOS).entries()) {
    try {
      const r = await fetch(`https://places.googleapis.com/v1/${f.name}/media?maxWidthPx=1600&key=${process.env.GOOGLE_PLACES_API_KEY}`);
      if (!r.ok) continue;
      const arq = `img/foto-${i + 1}.jpg`;
      await fs.writeFile(path.join(pasta, arq), Buffer.from(await r.arrayBuffer()));
      fotos.push(arq);
    } catch { /* ignora foto com erro */ }
  }

  const cidade = (p.addressComponents || []).find(c => c.types?.includes('administrative_area_level_2'))?.longText
    || (p.addressComponents || []).find(c => c.types?.includes('locality'))?.longText || '';
  const uf = (p.addressComponents || []).find(c => c.types?.includes('administrative_area_level_1'))?.shortText || '';

  const dados = {
    slug, nome,
    categoria: p.primaryTypeDisplayName?.text || '',
    tipos: p.types || [],
    nichoSugerido: sugerirNicho([p.primaryType, ...(p.types || [])].filter(Boolean)),
    resumo: p.editorialSummary?.text || '',
    endereco: p.formattedAddress || '',
    enderecoCurto: p.shortFormattedAddress || '',
    cidade, uf,
    telefone: p.nationalPhoneNumber || '',
    telefoneInternacional: p.internationalPhoneNumber || '',
    whatsapp: whatsappDe(p.nationalPhoneNumber),
    horarios: p.regularOpeningHours?.weekdayDescriptions || [],
    nota: p.rating ?? null,
    totalAvaliacoes: p.userRatingCount ?? 0,
    avaliacoes: (p.reviews || []).map(r => ({
      autor: r.authorAttribution?.displayName || 'Cliente',
      nota: r.rating, texto: r.text?.text || r.originalText?.text || '',
      quando: r.relativePublishTimeDescription || '',
    })),
    fotos,
    lat: p.location?.latitude ?? lat, lng: p.location?.longitude ?? lng,
    mapsUrl: p.googleMapsUri || '',
    siteAtual: p.websiteUri || null,
    coletadoEm: new Date().toISOString(),
  };

  await fs.writeFile(path.join(pasta, 'dados.json'), JSON.stringify(dados, null, 2));
  console.log(`OK: ${nome}`);
  console.log(`  pasta: saida/${slug}`);
  console.log(`  nicho sugerido: ${dados.nichoSugerido} (${dados.categoria})`);
  console.log(`  fotos: ${fotos.length} | avaliações: ${dados.avaliacoes.length} | nota: ${dados.nota ?? '-'}`);
  console.log(`  WhatsApp: ${dados.whatsapp ? 'sim' : 'não identificado (telefone fixo ou ausente)'}`);
  if (dados.siteAtual) console.log(`  ATENÇÃO: a empresa já tem site cadastrado: ${dados.siteAtual}`);
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
