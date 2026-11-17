# site-maps — JR Dev

Do link do Google Maps até o site de demonstração no ar.

## Instalação (uma vez, no PC do trabalho)
1. Instale o **Node.js LTS** (nodejs.org) e o **Git**.
2. Extraia esta pasta em `C:\JRDev\site-maps\`.
3. No terminal, dentro da pasta:
   ```
   npm install -g @anthropic-ai/claude-code netlify-cli
   netlify login
   ```
4. Google Cloud (console.cloud.google.com):
   - Crie um projeto "JR Dev" e ative o faturamento (com **alerta de orçamento** baixo).
   - APIs e serviços → ative **Places API (New)**.
   - Credenciais → Criar chave de API → **restrinja à Places API (New)**.
5. Copie `.env.exemplo` para `.env` e cole a chave.

## Uso
Abra o Claude Code na pasta (`claude`) e rode:
```
/site-maps https://maps.app.goo.gl/xxxx
/site-maps "Barbearia do Zé Sertãozinho" barbearia
```

Prospecção de uma região inteira (lista quem não tem site e gera as demos):
```
/prospectar "Sertãozinho SP"
/prospectar "Ribeirão Preto SP" barbearia,oficina 10
```

Ou manualmente:
```
node scripts/prospectar.mjs "Sertãozinho SP" --nichos barbearia,oficina --min-avaliacoes 10
node scripts/coletar.mjs --id <placeId da lista>
```
```
node scripts/coletar.mjs "<link>"
node scripts/gerar.mjs <slug> --nicho oficina
netlify sites:create --name <slug>-jrdev
netlify deploy --prod --dir saida/<slug> --site <slug>-jrdev
```

Uso da cota grátis do Google no mês: `node scripts/uso.mjs`. Se um script parar com "LIMITE", ele não consultou nada; para rodar mesmo assim, repita com `--confirmar`.

Quando o cliente fechar: `node scripts/gerar.mjs <slug> --final` (tira a faixa de demonstração e o noindex).
