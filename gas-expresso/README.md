# Gás Expresso — Backend Auth V1

Base oficial da implementação backend do Gás Expresso.

Esta versão inicia a API real para identidade e entrada dos três perfis: Cliente, Entregador e Fornecedor.

## Fluxo

```text
Cliente      -> ACTIVE
Entregador   -> PENDING_REVIEW
Fornecedor   -> PENDING_REVIEW
Administrador -> criação controlada (não existe cadastro público)
```

## Stack

- NestJS + TypeScript
- PostgreSQL
- Prisma
- JWT + Passport
- bcrypt
- class-validator
- Arquitetura modular preparada para Clean/Hexagonal

## Estrutura

```text
backend/src/
├── config/
├── infrastructure/database/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── customers/
│   ├── drivers/
│   └── suppliers/
└── shared/domain/
```

## Primeiros passos

Na raiz do repositório, subir a infraestrutura:

```powershell
docker compose -f infra/docker/docker-compose.yml up -d
```

Depois entrar no backend:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:push
npm run start:dev
```

API base:

```text
http://localhost:3000/api/v1
```

A aprovação documental de Driver/Supplier e o painel administrativo ainda serão implementados no próximo bloco de backend.
