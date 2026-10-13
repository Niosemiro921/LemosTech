# Gás Expresso Backend 2.0.0

Backend NestJS + Prisma + PostgreSQL na porta 5048.

## Principais alterações
- Role PRESTADOR real.
- Registo profissional e comercial com validação documental.
- Carteira operacional em AOA/Kz.
- Recarga com confirmação administrativa.
- Levantamento com reserva transacional: PENDING -> APPROVED -> PAID/REJECTED.
- Comissão configurável por `PLATFORM_COMMISSION_RATE`.
- Prioridade de dispatch combinando saldo, proximidade, confiabilidade e continuidade.
- Localização do profissional enviada ao backend apenas online.
- Realtime por SSE para localização e chat de pedido.
- Chat por pedido entre cliente e profissional.
- Revogação server-side de JWT no logout.
- Admin: candidaturas, carteira, dispatch, auditoria e email.
- Fornecedor: dashboard, stock/pedidos existentes, lotes, financeiro, clientes e CRM.

## Arranque local
1. `npm ci`
2. `npx prisma generate`
3. configure `.env` a partir de `.env.example`
4. `npx prisma migrate deploy`
5. `npm run build`
6. `npm run start:dev`

A migration desta release é aditiva e está em `prisma/migrations/20261008_gas_expresso_v2`.
