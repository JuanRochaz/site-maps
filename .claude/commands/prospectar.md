---
description: Busca empresas de uma região no Google Maps, lista as que não têm site e gera as páginas de demonstração
argument-hint: <"cidade UF"> [nichos separados por vírgula] [quantas demos gerar]
---

Faça a prospecção da JR Dev para: $ARGUMENTS

Leia o CLAUDE.md do projeto antes. Siga estes passos:

0. **Uso do mês**: rode `node scripts/uso.mjs` e mostre ao Juan quanto já foi usado. Se algum script parar com "LIMITE" (código de saída 2), NÃO repita com `--confirmar` por conta própria: mostre a mensagem ao Juan e só rode com `--confirmar` se ele autorizar.

1. **Buscar a região**
   - `node scripts/prospectar.mjs "<cidade UF>"` (se o Juan informou nichos: `--nichos a,b`).
   - Mostre ao Juan uma tabela com os 15 primeiros: posição, nome, nicho, nota, nº de avaliações, situação do site (sem site / só rede social) e se tem WhatsApp.
   - Avise sobre os marcados "FORA DA CIDADE" e sobre nomes que parecem rede/franquia (ex.: nome de marca nacional), pois esses raramente fecham.
   - Diga onde ficou a lista completa (`prospeccao/<regiao>-<data>/lista.csv`).

2. **Escolher quem vai ganhar demo**
   - Se o Juan informou quantas demos (ex.: "10"), use os N primeiros da lista, pulando franquias e os de fora da cidade.
   - Se não informou, PERGUNTE quais ele quer (números da tabela ou "top N"). Não gere nada sem essa escolha.

3. **Para cada empresa escolhida** (uma por vez):
   - `node scripts/coletar.mjs --id <placeId>` (o placeId está na lista.json).
   - Se `siteAtual` vier preenchido com um site próprio, pule e avise.
   - Escreva `saida/<slug>/textos.json` exatamente como no passo 3 do `/site-maps` (sem inventar preço, tempo de mercado, prêmios, nomes ou serviços).
   - `node scripts/gerar.mjs <slug> --nicho <nicho da lista>`
   - Confira nome, telefone/WhatsApp, horários e endereço do index.html contra o dados.json.

4. **Resumo**: tabela com empresa, nicho, pasta `saida/<slug>/index.html`, WhatsApp sim/não e o texto do `whatsapp.txt` de cada uma.

5. **Publicar**: PERGUNTE ao Juan se pode publicar todas (ou quais) na Netlify. Só depois do OK, para cada uma, siga o passo 6 do `/site-maps` e atualize o link no `whatsapp.txt`.

Nunca envie mensagens para as empresas: o Juan é quem faz a abordagem.
