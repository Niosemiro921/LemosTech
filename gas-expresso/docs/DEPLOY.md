# Deploy — Gás Expresso

O projeto tem dois artefactos independentes:

| Parte | Saída | Como corre |
| --- | --- | --- |
| Frontend | `frontend/dist` (estático) | CDN / Nginx / Vercel / Netlify |
| Backend | `backend/dist/main.js` (Node) | Contentor Node / Render / Railway / VPS |

Em produção têm de correr em processos/serviços separados. O frontend **não** serve o backend, exceto quando um Nginx faz proxy dos dois (Opção A).

---

## Opção A — Docker Compose no mesmo servidor (recomendada)

Um único domínio: o Nginx do frontend serve o React e faz proxy de `/api/` e `/uploads/` para o backend. Evita CORS.

### 1. Preparar

```bash
cd gas-expresso
cp .env.production.example .env.production
# edite .env.production (password da BD, JWT_SECRET, billing, SMTP)
```

Ajuste `VITE_API_BASE_URL=/api/v1` (já é o default) e `WEB_PORT=80`.

### 2. Arrancar

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

O backend aplica `prisma migrate deploy` automaticamente ao arrancar (`RUN_MIGRATIONS=true`).

### 3. Verificar

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -I http://localhost/api/v1
```

### 4. HTTPS

Coloque um proxy TLS à frente do contentor `frontend` (porta 80):

- **Caddy** (mais simples):
  ```caddyfile
  seudominio.com {
      reverse_proxy 127.0.0.1:80
  }
  ```
- Ou Nginx + Certbot.
- Ou Traefik com labels.

O proxy TLS deve repassar os headers `Host`, `X-Forwarded-For` e `X-Forwarded-Proto`.

### 5. Atualizar

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

### 6. Backup da base de dados

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  pg_dump -U gas_expresso gas_expresso > backup.sql
```

---

## Opção B — Frontend e backend em sítios diferentes

Útil para Vercel/Netlify (frontend) + Render/Railway/Fly (backend).

### Frontend (estático)

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Variáveis de build:
  ```
  VITE_API_BASE_URL=https://api.seudominio.com/api/v1
  VITE_REALTIME_URL=https://api.seudominio.com
  ```
- Configurar fallback SPA (rewrite de todas as rotas para `index.html`).

### Backend (Node)

- Build: `npm ci && npx prisma generate && npm run build`
- Start: `npm start` (`node dist/main.js`)
- Pré-deploy: `npx prisma migrate deploy`
- Variáveis: as mesmas do `.env.production.example`
- `CORS_ORIGIN=https://app.seudominio.com`
- Volume persistente para `uploads/` ou storage externo (S3/R2).

### Nginx alternativo (frontend estático + proxy da API)

Se não usar Vercel/Netlify, pode usar o `frontend/nginx.conf` como base e publicar `frontend/dist`. Neste caso mantenha o bloco `/api/` e `/uploads/` apontando para a URL pública do backend.

---

## Uploads

O backend guarda ficheiros em `MEDIA_STORAGE_PATH` (por omissão `/app/uploads` no contentor).

- Em Docker: volume `uploads` já configurado.
- Em PaaS: monte um volume persistente.
- Em múltiplas instâncias: use S3/Cloudflare R2 (requer adaptação do `MediaService`).

Sem isto, comprovativos e fotografias desaparecem em cada deploy.

---

## Migrações

```bash
# dentro do backend
npx prisma migrate deploy
```

Nunca use `migrate dev` em produção.

Se `RUN_MIGRATIONS=false`, execute a migração como passo separado antes de subir a nova versão.

---

## Criação do primeiro administrador

Com o backend e a base de dados a correr:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  node scripts/create-admin.js <telefone> <nome> "<palavra-passe>" [email]
```

Exemplo:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  node scripts/create-admin.js 921531066 "Administrador" "PalavraPasseForte2026" admin@exemplo.com
```

> A imagem de produção não inclui dependências de desenvolvimento (`npm prune --omit=dev`), por isso use o script JS em vez de `prisma/seed.ts`.

---

## CI

O workflow `.github/workflows/ci.yml` valida a cada push/PR:

- backend: `npm ci` → `prisma generate` → `npm run build`
- frontend: `npm ci` → `npm run build`
- build das imagens Docker

Para deploy automático, acrescente um passo de push das imagens para o registry e um passo de `docker compose pull && up -d` no servidor (ou deploy hook do PaaS).
