// gerar.mjs — saida/<slug>/dados.json (+ textos.json opcional) -> saida/<slug>/index.html
// Uso:
//   node scripts/gerar.mjs <slug> [--nicho barbearia|oficina|clinica|restaurante|geral] [--final]
// --final  remove a faixa de demonstração e o noindex (usar só depois que o cliente fechar).
// textos.json (opcional, escrito pelo Claude) sobrescreve qualquer campo do nicho.json:
//   { "heroTitulo": "...", "heroSubtitulo": "...", "sobreTitulo": "...", "sobreTexto": ["..."],
//     "servicos": [{"titulo":"...","descricao":"..."}], "ctaTitulo": "...", "botaoTexto": "..." }

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NICHOS = ['barbearia', 'oficina', 'clinica', 'restaurante', 'geral'];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lerJson = async (p, padrao) => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return padrao; } };

const ICONE_WPP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46m8.06-17.53A11.32 11.32 0 0 0 12.05.63C5.77.63.66 5.74.66 12.02c0 2 .52 3.96 1.52 5.69L.57 23.6l6.04-1.58a11.4 11.4 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.05"/></svg>';
const ICONE_TEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';

function estrelas(n) { const c = Math.round(n || 0); return '★'.repeat(c) + '☆'.repeat(5 - c); }

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find(a => !a.startsWith('--'));
  if (!slug) { console.error('Uso: node scripts/gerar.mjs <slug> [--nicho X] [--final]'); process.exit(1); }
  const iN = args.indexOf('--nicho');
  const final = args.includes('--final');
  const pasta = path.join(RAIZ, 'saida', slug);

  const d = await lerJson(path.join(pasta, 'dados.json'), null);
  if (!d) { console.error(`Não achei saida/${slug}/dados.json — rode o coletar.mjs antes.`); process.exit(1); }
  const nicho = iN > -1 ? args[iN + 1] : (d.nichoSugerido || 'geral');
  if (!NICHOS.includes(nicho)) { console.error('Nicho inválido. Use:', NICHOS.join(', ')); process.exit(1); }

  const cfg = { ...(await lerJson(path.join(RAIZ, 'modelos', nicho, 'nicho.json'), {})), ...(await lerJson(path.join(pasta, 'textos.json'), {})) };
  const html = await fs.readFile(path.join(RAIZ, 'modelos', '_base', 'base.html'), 'utf8');
  const css = (await fs.readFile(path.join(RAIZ, 'modelos', '_base', 'base.css'), 'utf8')) + '\n' +
              (await fs.readFile(path.join(RAIZ, 'modelos', nicho, 'tema.css'), 'utf8'));

  // ---- contato / links ----
  const temWpp = !!d.whatsapp;
  const linkContato = temWpp
    ? `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(cfg.mensagemWhatsapp || 'Olá! Vi o site e gostaria de mais informações.')}`
    : (d.telefone ? `tel:${d.telefone.replace(/\D/g, '')}` : '#contato');
  const textoBotao = temWpp ? cfg.botaoTexto : (d.telefone ? 'Ligar agora' : cfg.botaoTexto);
  const icone = temWpp ? ICONE_WPP : ICONE_TEL;
  const alvo = linkContato.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
  const botaoPrincipal = `<a class="btn btn-pri" href="${esc(linkContato)}"${alvo}>${icone}${esc(textoBotao)}</a>`;
  const linkRota = d.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`;
  const mapaEmbed = d.lat != null
    ? `https://maps.google.com/maps?q=${d.lat},${d.lng}&z=16&hl=pt-BR&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(d.endereco)}&z=16&hl=pt-BR&output=embed`;

  // ---- seções dinâmicas ----
  const fotos = d.fotos || [];
  const heroFoto = fotos[0];
  const sobreFoto = fotos[1] || fotos[0];

  const servicos = (cfg.servicos || []).map((s, i) =>
    `<article class="card"><span class="card-num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></article>`).join('\n      ');

  const galeriaFotos = fotos.slice(heroFoto ? 1 : 0, 6);
  const secaoGaleria = galeriaFotos.length >= 3 ? `
<section id="galeria" class="secao galeria">
  <div class="container">
    <span class="sobretitulo">Galeria</span>
    <h2>Um pouco do nosso dia a dia</h2>
    <div class="galeria-grid">
      ${galeriaFotos.map(f => `<figure><img src="${esc(f)}" alt="${esc(d.nome)}" loading="lazy"></figure>`).join('\n      ')}
    </div>
  </div>
</section>` : '';

  const boas = (d.avaliacoes || []).filter(a => a.texto && (a.nota ?? 5) >= 4).slice(0, 3);
  const secaoAval = boas.length ? `
<section id="avaliacoes" class="secao avaliacoes">
  <div class="container">
    <div class="aval-topo">
      <div><span class="sobretitulo">Avaliações</span><h2>Quem conhece, recomenda</h2></div>
      ${d.nota ? `<div class="aval-nota">${String(d.nota).replace('.', ',')} <span class="estrelas">${estrelas(d.nota)}</span><small>${d.totalAvaliacoes} avaliações no Google</small></div>` : ''}
    </div>
    <div class="aval-grid">
      ${boas.map(a => {
        const t = a.texto.length > 280 ? a.texto.slice(0, 277).trimEnd() + '…' : a.texto;
        return `<blockquote class="aval"><span class="estrelas">${estrelas(a.nota)}</span><p>“${esc(t)}”</p><footer>${esc(a.autor)} <span>· ${esc(a.quando)}</span></footer></blockquote>`;
      }).join('\n      ')}
    </div>
  </div>
</section>` : '';

  const horarios = (d.horarios || []).length ? `<ul class="horarios">${d.horarios.map(h => {
    const [dia, ...resto] = h.split(': ');
    return `<li><span>${esc(dia.replace('-feira', ''))}</span><span>${esc(resto.join(': ') || '')}</span></li>`;
  }).join('')}</ul>` : '';

  const descricao = `${d.nome}${d.categoria ? ' — ' + d.categoria : ''}${d.cidade ? ' em ' + d.cidade + (d.uf ? '/' + d.uf : '') : ''}. ${cfg.heroSubtitulo || ''}`.slice(0, 158);

  const mapa = {
    TITULO_PAGINA: esc(`${d.nome}${d.cidade ? ' | ' + d.cidade : ''}`),
    DESCRICAO: esc(descricao),
    META_ROBOTS: final ? '' : '<meta name="robots" content="noindex, nofollow">',
    OG_IMAGEM: heroFoto ? `<meta property="og:image" content="${esc(heroFoto)}">` : '',
    FONTES_URL: esc(cfg.fontes || ''),
    CSS: css,
    NICHO: nicho,
    FAIXA_DEMO: final ? '' : '<div class="faixa-demo">Demonstração criada pela <a href="https://instagram.com/jrdev.tecnologia" target="_blank" rel="noopener">JR Dev</a> — este ainda não é o site oficial da empresa.</div>',
    NOME: esc(d.nome),
    MENU_SERVICOS: esc(cfg.menuServicos || 'Serviços'),
    MENU_AVALIACOES: boas.length ? '<a href="#avaliacoes">Avaliações</a>' : '',
    BOTAO_TOPO: `<a class="btn btn-pri" href="${esc(linkContato)}"${alvo}>${esc(textoBotao)}</a>`,
    HERO_CLASSE: heroFoto ? 'com-foto' : '',
    HERO_ESTILO: heroFoto ? `style="background-image:url('${esc(heroFoto)}')"` : '',
    CATEGORIA: esc(d.categoria || cfg.nome || ''),
    CIDADE_TAG: d.cidade ? ` · ${esc(d.cidade)}` : '',
    HERO_TITULO: esc(cfg.heroTitulo),
    HERO_SUBTITULO: esc(cfg.heroSubtitulo),
    BOTAO_PRINCIPAL: botaoPrincipal,
    LINK_ROTA: esc(linkRota),
    HERO_NOTA: d.nota ? `<div class="hero-nota"><span class="estrelas">${estrelas(d.nota)}</span> <strong>${String(d.nota).replace('.', ',')}</strong> · ${d.totalAvaliacoes} avaliações no Google</div>` : '',
    SOBRE_TITULO: esc(cfg.sobreTitulo),
    SOBRE_TEXTO: (cfg.sobreTexto || []).map(p => `<p>${esc(p)}</p>`).join('\n      '),
    SOBRE_FOTO: sobreFoto ? `<div class="sobre-foto"><img src="${esc(sobreFoto)}" alt="${esc(d.nome)}" loading="lazy"></div>` : '',
    SERVICOS_SOBRETITULO: esc(cfg.servicosSobretitulo || 'Serviços'),
    SERVICOS_TITULO: esc(cfg.servicosTitulo || 'Serviços'),
    SERVICOS: servicos,
    SECAO_GALERIA: secaoGaleria,
    SECAO_AVALIACOES: secaoAval,
    ENDERECO: esc(d.endereco),
    TELEFONE_LINHA: d.telefone ? `<p class="tel">${esc(d.telefone)}</p>` : '',
    HORARIOS: horarios,
    MAPA_EMBED: esc(mapaEmbed),
    CTA_TITULO: esc(cfg.ctaTitulo),
    BOTAO_FLUTUANTE: temWpp ? `<a class="flutuante" href="${esc(linkContato)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONE_WPP}</a>` : '',
  };

  const saida = html.replace(/\{\{([A-Z_]+)\}\}/g, (_, k) => (k in mapa ? mapa[k] : ''));
  await fs.writeFile(path.join(pasta, 'index.html'), saida);

  // ---- mensagem de abordagem ----
  const linkDemo = `https://${slug}-jrdev.netlify.app`;
  const msg = `Olá, tudo bem? Sou o Juan, da JR Dev.
Vi que a ${d.nome}${d.nota ? ` tem ótimas avaliações no Google (nota ${String(d.nota).replace('.', ',')})` : ' aparece no Google'}, mas ainda não tem um site. Tomei a liberdade de montar uma demonstração de como ele poderia ficar:
${linkDemo}

Se gostar, consigo deixar no ar com o seu domínio, as suas fotos e um botão direto pro WhatsApp. Posso te mandar os valores?`;
  await fs.writeFile(path.join(pasta, 'whatsapp.txt'), msg);

  console.log(`OK: saida/${slug}/index.html  (nicho: ${nicho}${final ? ', versão FINAL' : ', demonstração'})`);
  console.log(`    mensagem: saida/${slug}/whatsapp.txt`);
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
