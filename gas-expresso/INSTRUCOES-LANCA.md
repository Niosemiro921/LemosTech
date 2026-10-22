# Instruções de Lançamento — Gás Expresso

Estado do sistema em 2026-10-21.

## O que funciona (v1.0)

- Cadastro: Cliente, Entregador, Empresa (Fornecedor / Admin)
- Pedidos: cotação, criação, rastreio, entrega
- Fornecedor: dashboard, stock (entrada/saída/relatório), pedidos, clientes, segmentos
- Pagamentos: Na entrega (`PAY_ON_DELIVERY`); endpoints `/suppliers/me/payments` e `/expenses` operacionais
- Analytics: eventos rastreados; painel admin `/admin/analytics`
- Segurança: rotas protegidas por `JwtAuthGuard`, `RolesGuard`, `ActiveAccountGuard`

## Como iniciar o ambiente

```bash
# Backend
npm run start:dev       # porta 5048 (padrão)
# Frontend
npm run dev             # porta 5173 (padrão Vite)
```

- DB: PostgreSQL (`DATABASE_URL` no `.env` do backend)
- Pré-requisito: `npx prisma generate` após alterações de schema (já feito para `AnalyticsEvent`)

## Passos antes do lançamento (teste final)

1. Executar verificação end-to-end (`verify-flow.mjs` no backend):
   - Registo → Aprovação admin → Login → Stock → Movimentos → Analytics
2. Confirmar que todos os módulos estão ativos: `auth`, `orders`, `suppliers/me/*`, `products`, `inventory`, `analytics`, `admin`
3. Revisar `BACKEND-CONTRACT-V2.md` para garantir contratos de integração

## Notas importantes

- O perfil de fornecedor usa `/fornecedor`; o de administrado usa `/admin`.
- O stock só aparece quando há produto no catálogo (`/products`). Verificar seed se necessário.
- Os testes automáticos de lançamento estão agendados para a semana de lançamento.
