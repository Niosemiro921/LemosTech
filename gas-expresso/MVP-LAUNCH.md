# Gás Expresso — MVP Lançamento Dezembro (Dev Solo)

## Estado atual (verificado 16/10/2026)
- **Backend:** 29 módulos (auth, orders, products, inventory, deliveries, payments, drivers, suppliers, admin, realtime, chat).
- **Auth completo:** `/auth/register/customer`, `/auth/register/driver`, `/auth/register/supplier`, `/auth/login`, `/auth/me`, `/auth/logout`.
- **Order lifecycle:** `/orders/quote`, `POST /orders` (idempotente), `GET /orders/mine`, `GET /orders/mine/:id`.
- **Deliveries:** módulo com controller e service.
- **Admin:** `AdminDashboardPage`, `AdminOrdersPage`, `AdminDispatchPage`, `AdminApplicationsPage` já existem no frontend.
- **Frontend:** React 19 + Vite, páginas principais implementadas.

## O que falta para lançamento (prioridade 1 — Dezembro)
1. **Correções de integração:** verificar contratos reais entre frontend e backend.
2. **Verificar se `products` e `inventory` estão com endpoints expostos.**
3. **Garantir que `payments` e `tracking` estejam conectados.**
4. **Build de produção e teste end-to-end.**
5. **Correções de segurança e lint.**

## Prioridades (ordem de execução)
- [P1] Verificar endpoints expostos (`/products`, `/inventory`, `/payments`, `/deliveries`)
- [P1] Corrigir bugs de código encontrados durante verificação
- [P2] Verificar contratos de backend com frontend (`BACKEND-CONTRACT-V2.md`)
- [P2] Criar script de build/teste automatizado
- [P3] Aumentar documentação mínima de arquitetura
- [P4] Deixar admin/review/pagamento digital para pós-lançamento (v1.1)

## Decisão: Lançar com o que funciona
- **Não bloquear lançamento** por painel admin completo, aprovação documental automática, ou pagamento digital real.
- **Lançar v1.0** com: cadastro dos 3 perfis, pedidos com cotação, tracking básico, pagamento manual (dinheiro/MPesa) e admin básico (leitura, não aprovação automática).
