# Projeto site-maps — JR Dev

Gerador de sites de demonstração para prospecção: link do Google Maps → site → Netlify.
Dono: Juan Rocha (JR Dev, Instagram @jrdev.tecnologia). Responder sempre em português do Brasil.

## Comando principal
`/site-maps <link do Maps | "nome cidade"> [nicho]` — ver `.claude/commands/site-maps.md`.
`/prospectar "<cidade UF>" [nichos] [quantidade]` — varre a região, lista quem não tem site e gera as demos em lote — ver `.claude/commands/prospectar.md`.

## Estrutura
- `scripts/prospectar.mjs` — busca por região/nicho → `prospeccao/<regiao>-<data>/lista.csv` + `lista.json` (só quem não tem site ou tem só rede social, ordenado por pontos)
- `scripts/coletar.mjs` — Places API (New) → `saida/<slug>/dados.json` + `img/` (aceita link, `--busca` ou `--id <placeId>`)
- `scripts/uso.mjs` — conta as consultas pagas do mês em `uso/AAAA-MM.json` e trava antes de passar do limite de segurança (900 por tipo; mudar com `USO_LIMITE_*` no `.env`). `node scripts/uso.mjs` mostra o uso.
- `scripts/gerar.mjs` — monta `saida/<slug>/index.html` + `whatsapp.txt` (`--final` tira faixa demo e noindex)
- `modelos/_base/` — HTML e CSS comuns a todos os nichos (placeholders `{{CHAVE}}`)
- `modelos/<nicho>/nicho.json` — textos padrão, fontes, serviços, texto do botão
- `modelos/<nicho>/tema.css` — cores, fontes e detalhes visuais do nicho
- Nichos: `barbearia`, `oficina`, `clinica`, `restaurante`, `geral` (escritórios, contabilidade, serviços)

## Regras
- A chave do Google fica SÓ no `.env`. Nunca colocar no HTML, no Git ou em log.
- Toda demonstração sai com faixa "Demonstração JR Dev" + `noindex`. `--final` só depois do cliente fechar.
- Não inventar dados da empresa (preço, tempo de mercado, prêmios, nomes). Na dúvida, texto genérico.
- Fotos e avaliações do Google são só para a demo; na versão final, usar material do cliente.
- Sempre pedir confirmação ao Juan antes de publicar na Netlify.
- Nunca enviar mensagem para as empresas prospectadas; a abordagem é sempre do Juan.
- Se um script parar com "LIMITE" (código 2), mostrar ao Juan e só usar `--confirmar` com a autorização dele.
- Para criar um novo nicho: copiar uma pasta de `modelos/`, ajustar `nicho.json` e `tema.css`, e incluir o nome em `NICHOS` no `gerar.mjs` e na regra de `sugerirNicho` no `coletar.mjs`.
