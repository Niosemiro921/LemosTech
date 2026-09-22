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

### Regras importantes

- O fornecedor só pode iniciar o dispatch dos seus próprios pedidos.
- O administrador pode iniciar o dispatch de pedidos que tenha autorização para operar.
- Apenas entregadores `ACTIVE` podem ficar online.
- O match considera localização, capacidade do veículo, avaliação e taxa de aceitação.
- A aceitação do motorista usa uma atualização condicional do pedido dentro de uma transação para impedir que dois entregadores assumam o mesmo pedido.
- A oferta tem TTL configurável e passa para `EXPIRED` quando ultrapassa a validade.

## Desenvolvimento

Valores padrão para a simulação local:

```env
PLATFORM_COMMISSION_RATE=0.08
DISPATCH_RADIUS_KM=15
DISPATCH_OFFER_TTL_SECONDS=30
```

As credenciais criadas pelo seed são apenas para desenvolvimento local. Nunca as utilize em produção.
