---
description: Gera um site de demonstração da JR Dev a partir de um link do Google Maps e publica na Netlify
argument-hint: <link do Google Maps ou "nome + cidade"> [nicho]
---

Gere um site de demonstração para a empresa: $ARGUMENTS

Siga exatamente estes passos (leia o CLAUDE.md do projeto antes):

0. Se o `coletar.mjs` parar com "LIMITE" (código 2), mostre a mensagem ao Juan e só rode de novo com `--confirmar` se ele autorizar.

1. **Coleta**
   - Se o argumento for um link: `node scripts/coletar.mjs "<link>"`
   - Se for texto (nome + cidade): `node scripts/coletar.mjs --busca "<texto>"`
   - Leia `saida/<slug>/dados.json`. Se `siteAtual` vier preenchido, AVISE o Juan que a empresa já tem site e pergunte se quer continuar.

2. **Nicho**: use o nicho informado no argumento. Se não houver, use `nichoSugerido` do dados.json. Se a categoria não bater com nenhum dos 4 nichos (barbearia, oficina, clinica, restaurante), use `geral`. Informe qual nicho escolheu.

3. **Textos personalizados**: escreva `saida/<slug>/textos.json` adaptando os textos do `modelos/<nicho>/nicho.json` para ESTA empresa (nome, categoria exata, cidade, o que as avaliações elogiam). Campos: heroTitulo, heroSubtitulo, sobreTitulo, sobreTexto (2 parágrafos), servicos (4 itens com titulo e descricao), ctaTitulo.
   - Português do Brasil, tom próximo e profissional, frases curtas.
   - NÃO invente preço, anos de mercado, prêmios, certificações, nomes de profissionais ou serviços que não dá pra deduzir da categoria/avaliações. Se não souber, mantenha genérico.

4. **Gerar**: `node scripts/gerar.mjs <slug> --nicho <nicho>`

5. **Conferir**: abra `saida/<slug>/index.html` (ou descreva) e confira nome, telefone/WhatsApp, horários e endereço contra o dados.json.

6. **Publicar** (perguntar antes ao Juan se pode publicar):
   - `netlify sites:create --name <slug>-jrdev --disable-linking --json` (se o nome já existir, use `<slug>-jrdev-2`). Guarde o `id` do JSON.
     O `--disable-linking` é obrigatório: sem ele a pasta fica "amarrada" ao primeiro site e o próximo deploy SOBRESCREVE esse site.
   - `netlify deploy --prod --no-build --dir saida/<slug> --site <id> --json` (sempre pelo ID, nunca sem `--site`)
   - A conta da JR Dev pode criar sites com "login da equipe" ligado (quem abre vê uma tela de login). Libere o site:
     `netlify api updateSite --data '{"site_id":"<id>","body":{"sso_login":false}}'`
   - Confira que o link abre para qualquer pessoa (status 200, não 401) antes de passar para o Juan.
   - Se o nome final do site mudou, atualize o link em `saida/<slug>/whatsapp.txt`.

7. **Entregar ao Juan**: link publicado, nicho usado, um resumo do que foi coletado (nota, nº de avaliações, se tem WhatsApp) e o texto de `whatsapp.txt` pronto pra copiar. Ofereça gerar a proposta comercial com a skill de proposta da JR Dev.
