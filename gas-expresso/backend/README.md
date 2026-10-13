# Gás Expresso Backend

Backend do Gás Expresso construído com NestJS, TypeScript, PostgreSQL e Prisma.

## Arquitetura

- Modular Monolith
- Clean Architecture / Hexagonal por módulo
- PostgreSQL como fonte de verdade transacional
- Redis preparado para locks, rate limiting e estado efémero
- Idempotência para operações críticas
- RBAC por role

## Módulos principais

```text
src/modules/
├── auth/
├── users/
├── customers/
├── drivers/
├── suppliers/
├── admin/
├── products/
├── inventory/
├── orders/
└── dispatch/
```

## Fluxo transacional atual

```text
CLIENTE
  ↓
QUOTE
  ↓
STOCK + FORNECEDOR
  ↓
CREATE ORDER
  ↓
FORNECEDOR ACEITA
  ↓
PREPARA
  ↓
READY_FOR_PICKUP
  ↓
DISPATCH
  ↓
OFERTAS A ENTREGADORES
  ↓
ENTREGADOR ACEITA
  ↓
DRIVER_ACCEPTED
```

## Configuração

Inicie a base de dados e o Redis a partir da pasta `backend`:

```powershell
docker compose -f ..\infra\docker\docker-compose.yml up -d
```

O PostgreSQL do Compose fica acessível na porta local `5433` para não colidir com instalações PostgreSQL existentes. O `DATABASE_URL` de `.env.example` já aponta para essa porta.

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run start:dev
```

## API

Prefixo global:

```text
/api/v1
```

### Conta do cliente

```http
GET   /auth/me
PATCH /auth/me
GET   /orders/mine
GET   /orders/mine/:orderId/tracking
```

O cliente pode alterar o nome e o email da própria conta; o telefone de autenticação não é alterável nesta versão.

### Dispatch

```http
POST /dispatch/orders/:orderId/start
GET  /drivers/me/offers
POST /drivers/me/offers/:offerId/accept
POST /drivers/me/offers/:offerId/reject
POST /drivers/me/online
POST /drivers/me/offline
POST /drivers/me/location
GET  /orders/mine/:orderId/tracking
```

### Backoffice operacional

```http
GET  /admin/overview
GET  /admin/partners?type=DRIVER|SUPPLIER
POST /admin/partners/:id/approve
POST /admin/partners/:id/reject
POST /admin/partners/:id/suspend
POST /admin/partners/:id/reactivate
GET  /admin/orders
GET  /admin/dispatch/queue
POST /admin/dispatch/orders/:orderId/retry
GET  /admin/audit
```

Estas rotas exigem uma sessão autenticada com role `ADMIN`. A rejeição de parceiro exige `reason`. A recomendação do dispatch considera disponibilidade, capacidade, proximidade, avaliação e taxa de aceitação; o saldo mínimo confirmado é uma condição de elegibilidade, não um fator adicional de pontuação. A fila inclui o saldo do entregador recomendado. Métricas de incidentes, documentos expirados e receita não são devolvidas até existirem os respetivos modelos transacionais.

### Regras importantes

- O fornecedor só pode iniciar o dispatch dos seus próprios pedidos.
- O administrador pode iniciar o dispatch de pedidos que tenha autorização para operar.
- Apenas entregadores `ACTIVE` podem ficar online.
- O match considera localização, capacidade do veículo, avaliação e taxa de aceitação.
- A aceitação do motorista usa uma atualização condicional do pedido dentro de uma transação para impedir que dois entregadores assumam o mesmo pedido.
- A oferta tem TTL configurável e passa para `EXPIRED` quando ultrapassa a validade.

### Integrações V2 do frontend

```http
GET/POST /customers/me/addresses
PATCH/DELETE /customers/me/addresses/:id
GET                   /notifications
POST                  /notifications/:id/read
POST                  /notifications/read-all
GET/POST              /support/tickets
GET/POST              /incidents/mine
GET                   /drivers/me/documents
POST                  /drivers/me/documents/:id/review
GET                   /suppliers/me/documents
POST                  /suppliers/me/documents/:id/review
GET                   /suppliers/me/team
GET/PATCH             /suppliers/me/schedule
GET                   /inventory/availability?latitude=...&longitude=...
GET                   /drivers/me/wallet
GET                   /drivers/me/wallet/transactions
GET                   /drivers/me/earnings
GET                   /drivers/me/wallet/priority-policy
POST                  /drivers/me/wallet/top-ups
GET                   /admin/wallet/top-ups
POST                  /admin/wallet/top-ups/:id/confirm
POST                  /admin/wallet/top-ups/:id/reject
```

Endereços, tickets, incidentes, notificações, horários, carteira e pedidos de recarga são persistidos no PostgreSQL. Documentos só aparecem depois de serem registados por um fluxo de upload/revisão ainda não disponível. A aprovação administrativa da recarga é manual: não substitui confirmação de pagamento por um provedor. A carteira começa com saldo zero; o entregador só pode ficar online e receber ofertas com o saldo mínimo confirmado (`MINIMUM_DRIVER_OPERATING_BALANCE`, padrão `10000` AOA). `/drivers/me/earnings` devolve os 100 ganhos acumulados mais recentes: 90% da taxa de entrega concluída para o entregador e 10% para a plataforma, arredondado ao kwanza mais próximo. Estes valores não são levantamentos nem crédito na carteira operacional; levantamentos continuam desligados até existir um fluxo de liquidação. Horários de empresa são guardados, mas ainda não bloqueiam automaticamente a aceitação de pedidos.

No frontend, configure `VITE_API_BASE_URL=http://localhost:5048/api/v1`. Os caminhos da carteira administrativa podem usar `/admin/wallet/top-ups`, `/admin/wallet/top-ups/:id/confirm` e `/admin/wallet/top-ups/:id/reject`.

## Desenvolvimento

Valores padrão para a simulação local:

```env
PLATFORM_COMMISSION_RATE=0.08
DISPATCH_RADIUS_KM=15
DISPATCH_OFFER_TTL_SECONDS=30
```

O seed carrega o catálogo de produtos e cria contas demo para todos os perfis com o mesmo número e palavra-passe: `923000010` / `Demo@123`.

Os utilizadores são criados em modo de testes locais, mantendo os perfis de cliente, entregador, fornecedor e administrador disponíveis com as mesmas credenciais. Em produção, os utilizadores continuam a registar-se pela aplicação e as candidaturas de fornecedores e entregadores precisam de aprovação administrativa antes de operar.
