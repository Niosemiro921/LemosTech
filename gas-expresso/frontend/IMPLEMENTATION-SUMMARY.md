# Gás Expresso Frontend 3.0.0 — Resumo de implementação

## 1. Análise inicial
A implementação partiu dos serviços existentes no frontend e reaproveitou os contratos já identificados no código, em vez de introduzir clientes HTTP paralelos.

### Serviços reutilizados
- `src/services/auth.ts` — login, `/auth/me`, registo por perfil e logout configurável.
- `src/lib/api.ts` — cliente HTTP único, Bearer token, timeout com AbortController e tratamento de 401.
- `src/services/catalog.ts` — catálogo e moeda.
- `src/services/quote.ts` — cotação.
- `src/services/orders.ts` — pedidos.
- `src/services/tracking.ts` — rastreamento + realtime configurável.
- `src/services/driver.ts` — perfil, online/offline, localização, ofertas, entrega e ganhos.
- `src/services/driverFinance.ts` — carteira, transações, recargas e política de prioridade.
- `src/services/customer.ts` — endereços, notificações e suporte.
- `src/services/incidents.ts` — incidentes.
- `src/services/supplier.ts` — pedidos, inventário e operação da empresa.
- `src/services/company.ts` — documentos, equipa e horários.
- `src/services/admin.ts` — overview, parceiros, pedidos, dispatch e auditoria.

## 2. Alterações principais
### Sessão e autorização
- Roles: `CUSTOMER`, `DRIVER`, `SUPPLIER`, `ADMIN`, conforme o enum do backend.
- `Pedir gás` e `Rastrear` só aparecem para Cliente.
- Rotas igualmente protegidas por `RequireAuth`.
- Logout reutilizável em Header e Admin.
- Sessão verificada por `/auth/me` nas áreas protegidas.

### Entregador
- Dashboard mobile-first com mapa central.
- Online/offline via API.
- GPS do navegador apenas quando online.
- Marker próprio atualizado imediatamente com a posição do dispositivo.
- Ofertas reais ordenadas por distância e opcionalmente limitadas por raio configurado.
- Bottom sheet/área deslizável de ofertas em mobile.
- Histórico de ganhos usa `/drivers/me/earnings`; calcula 90% da taxa de entrega após conclusão, separado do saldo operacional e de levantamentos.
- Carteira baseada em `/drivers/me/wallet`, `/transactions`, `/top-ups`, `/priority-policy`.
- Recarga sem saldo local artificial.
- Levantamento preparado apenas por endpoint configurável real.

### Cliente
- Tracking real com polling de fallback e realtime configurável.
- Linha de estados operacionais e última atualização.
- Endereços reais via API, sem província/localidade por defeito.
- Notificações e suporte por API.

### Fornecedor / Empresa
- Portal independente ERP + CRM.
- Dashboard de pedidos e inventário real.
- Stock, pedidos, documentos, equipa e horários.
- Lotes, financeiro, CRM e relatórios possuem superfícies próprias, mas não fabricam dados quando os endpoints não estão identificados.

### Admin
- Logout visível e reutilizável.
- Admin com parceiros, pedidos, dispatch, auditoria e recargas.

## 3. Ficheiros criados ou fortemente refatorados
### Componentes
- `src/components/LogoutButton.tsx`
- `src/components/SupplierShell.tsx`
- `src/components/RequireAuth.tsx`
- `src/components/RealMap.tsx`

### Páginas
- `src/pages/DriverPage.tsx`
- `src/pages/DriverOrdersPage.tsx`
- `src/pages/DriverProfilePage.tsx`
- `src/pages/DriverWalletPage.tsx`
- `src/pages/DriverEarningsPage.tsx`
- `src/pages/DriverDocumentsPage.tsx`
- `src/pages/DriverIncidentsPage.tsx`
- `src/pages/AdminWalletTopUpsPage.tsx`
- `src/pages/SupplierModulePage.tsx`
- `src/pages/SupplierOrdersPage.tsx`
- `src/pages/SupplierStockPage.tsx`
- `src/pages/TrackingPage.tsx`
- `src/pages/CustomerAddressesPage.tsx`
- `src/pages/NotificationsPage.tsx`
- `src/pages/SupportPage.tsx`
- `src/pages/AdminDashboardPage.tsx`
- `src/pages/SupplierPage.tsx`

### Serviços
- `src/services/adminWallet.ts`
- `src/services/driverFinance.ts`
- `src/services/driver.ts`
- `src/services/auth.ts`

### Infraestrutura de frontend
- `src/app/routes.tsx`
- `src/app/styles.css`
- `src/components/Header.tsx`
- `src/components/BottomNav.tsx`
- `src/lib/api.ts`
- `src/vite-env.d.ts`
- `.env.example`
- `package.json`
- `package-lock.json`

## 4. Pendências de contrato
Como apenas o código frontend estava disponível para esta entrega, estes endpoints não puderam ser confirmados e não foram inventados:

1. Logout server-side / invalidação explícita da sessão.
2. Levantamento do entregador + histórico de levantamentos.
3. Lista/confirmar/rejeitar recargas no Admin.
4. Lotes: `/suppliers/me/lots`.
5. Financeiro: `/suppliers/me/invoices`, `/payments`, `/expenses`.
6. CRM: `/suppliers/me/customers`, `/suppliers/me/interactions`, `/suppliers/me/customers/segments`.
7. Relatórios: `/suppliers/me/reports/sales`, `/reports/retention`.
8. Canal realtime oficial e formato das mensagens, além da URL configurável.

As telas correspondentes mostram estado de integração pendente em vez de dados simulados.

## 5. Validação
- 67 ficheiros TS/TSX analisados por parser TypeScript: 0 erros de sintaxe.
- 401 classes CSS usadas no código: 0 regras em falta.
- Nenhum mock/fixture/fake identificado em `src` pela busca estática de termos.
- `npm ci`/`npm run typecheck`/`npm run build` devem ser executados no Windows de desenvolvimento para validar dependências nativas e o build final.
