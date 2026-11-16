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

Ou manualmente:
```
node scripts/coletar.mjs "<link>"
node scripts/gerar.mjs <slug> --nicho oficina
netlify sites:create --name <slug>-jrdev
netlify deploy --prod --dir saida/<slug> --site <slug>-jrdev
```

Quando o cliente fechar: `node scripts/gerar.mjs <slug> --final` (tira a faixa de demonstração e o noindex).
