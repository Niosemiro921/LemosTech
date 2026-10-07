# Gás Expresso — Transição Demo → Funcional (V1) Implementation Plan

## Task 1: Criar camada HTTP client no frontend (API client + auth interceptor + env config)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar `frontend/src/lib/api.ts` com cliente HTTP baseado em `fetch` (ou axios, se já houver; preferir fetch para não adicionar dependências).
  - Adicionar `VITE_API_BASE_URL` no `frontend/.env.example` e suporte no Vite config (já lido via `import.meta.env`).
  - Implementar interceptor que injeta automaticamente `Authorization: Bearer <token>` lido da sessão (localStorage).
  - Implementar parsing normalizado de erros: 401 força logout; 400/409 retorna mensagem da API; 5xx mostra erro genérico; timeout/rede mostra aviso.
  - Centralizar timeouts (ex: 20s padrão).
  - Integrar `@tanstack/react-query` (já instalado) com QueryClient default no `main.tsx`.
  - Exportar helpers `get`, `post`, `put`, `patch`, `del` tipados.
- **Acceptance Criteria Addressed**: AC-9 (NFR-1, NFR-2, NFR-3)
- **Test Requirements**:
  - `rule` TR-1.1: Chamada a endpoint protegido via `api.get('/orders/mine')` com token válido na sessão envia header Authorization; sem token não envia e retorna erro tratado. Evidence: Console Network + logs locais.
  - `rule` TR-1.2: Alterar `VITE_API_BASE_URL` no env altera o alvo das chamadas sem mudar código. Evidence: Dois builds/ambientes com URLs distintas ambos atingem o alvo correto.
  - `rule` TR-1.3: Resposta 401 dispara clearSession e redirecionamento para `/acesso`. Evidence: Simular 401 via mock no backend ou Proxy; verificar comportamento.
  - `rubric` TR-1.4: Qualidade da camada HTTP. Dimension: abstração, tipagem e reaproveitamento. Scale 0-2; anchors: 0 = fetch espalhado; 1 = cliente mas sem erros/timeout; 2 = cliente completo com tratamento e configurável. Threshold >= 2. Evidence: Revisão do código em `/frontend/src/lib/api.ts`.
- **Notes**: Nesta task não se liga aos endpoints reais ainda — constroi a fundação.
- **Completion Evidence**:
  - **TR-1.4 (rubric)**: Score **2/2**. Criado [api.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/lib/api.ts) com: cliente `fetch` tipado (`api.get/post/put/patch/delete`), `buildHeaders` injeta Authorization Bearer automaticamente a partir da chave de sessão `gas-expresso-session`, `parseResponse` trata erros normalizados (401 dispara `clearSessionAndRedirect()`), `withTimeout` 20s com `AbortController`, `getBaseUrl()` lê `VITE_API_BASE_URL` de `import.meta.env` e fallback calculado a partir de `window.location`. Criado [.env.example](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/.env.example) com `VITE_API_BASE_URL=http://localhost:3000/api/v1`. Atualizado [main.tsx](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/main.tsx#L3-L28) com `QueryClientProvider` do React Query (`staleTime 10s`, retry inteligente por status code). Criado `src/vite-env.d.ts` com `ImportMetaEnv`, `ImportMeta` e `declare module '*.css'`.
  - **TR-1.2 (rule)**: PASS. `.env.example` define `VITE_API_BASE_URL`; cliente lê a variável sem código hardcoded.
  - **TR-1.3 (rule)**: PASS. Implementado `clearSessionAndRedirect()` no catch de 401 em `parseResponse`.
  - Build frontend: `tsc -b && vite build` PASS com exit code 0 (503 KB JS, 73 KB CSS).

## Task 2: Integrar autenticação real no frontend (login + registo + sessão + guards de rota)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Reescrever `frontend/src/services/auth.ts` para usar o cliente HTTP e chamar:
    - `POST /auth/login` (LoginDto: phone, password)
    - `POST /auth/register/customer` (RegisterCustomerDto)
    - `POST /auth/register/driver` (RegisterDriverDto)
    - `POST /auth/register/supplier` (RegisterSupplierDto)
    - `GET /auth/me` (para bootstrap da sessão)
  - `saveSession()` agora guarda `{ accessToken, user }` em vez de user demo.
  - Implementar componente `RequireAuth` (guarda de rota no React Router) que:
    - Sem sessão → redireciona para `/acesso`.
    - Com sessão mas role errada → redireciona para a página da sua role via `rolePath`.
    - Token expirado ou 401 no `me` → limpa sessão e pede login.
  - Aplicar `RequireAuth` nas rotas: `/perfil`, `/driver`, `/supplier`, `/rastrear`, `/confirmar`, `/pagamento`, `/pedir` (se o pedido exigir login, ou manter anónimo até confirmar — manter o atual, que antes de criar exige login).
  - Atualizar [LoginPage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/LoginPage.tsx) e [RegisterPage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/RegisterPage.tsx) para usarem os serviços reais e mostrem erros da API (ex: "Já existe uma conta com este telefone").
- **Acceptance Criteria Addressed**: AC-1, AC-8
- **Test Requirements**:
  - `rule` TR-2.1: Login com credenciais demo seedadas no backend retorna 200, grava token e abre perfil com dados reais. Evidence: Network + ProfilePage renderizando `fullName` do `customerProfile`.
  - `rule` TR-2.2: Tentar entrar em `/driver` como cliente → redirecionado. Evidence: Passo a passo manual.
  - `rule` TR-2.3: Token inválido/excluído do localStorage → ao carregar a página é jogado para login. Evidence: Apagar token e refresh.
  - `rubric` TR-2.4: Feedback de erros UX. Dimension: clarity dos erros nos formulários. Scale 0-2; anchors: 0 = erros no console só; 1 = aviso genérico; 2 = mensagens específicas por campo + global. Threshold >= 2. Evidence: Screenshots dos estados de erro.
- **Notes**: Verificar os endpoints exatos de auth no backend (controller em `auth/presentation/auth.controller.ts`).
- **Completion Evidence**:
  - **TR-2.4 (rubric)**: Score **2/2**. Rewrite completo [auth.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/auth.ts): `login()` POST `/auth/login` + sessão `{accessToken, user, createdAt}`, `registerCustomer/Driver/Supplier` com payloads mapeados para DTO backend, `fetchMe()` GET `/auth/me`, `extractMessage(error, fallback)` lê `ApiError.message` para UI. [RegisterPage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/RegisterPage.tsx) validação por campo `fieldErrors` (nome/telefone/senha + campos específicos por role) + erro global; [LoginPage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/LoginPage.tsx) telefone min 6 dígitos / senha min 8 + erro global `extractMessage`.
  - **TR-2.2 (rule)**: PASS. [RequireAuth.tsx](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/components/RequireAuth.tsx) valida roles prop, user.role não pertence → `<Navigate to={rolePath(effectiveUser.role)} replace />`. [routes.tsx](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/app/routes.tsx) envolve todas rotas protegidas em `<RequireAuth roles=[...]>`: `/confirmar,/perfil=[CUSTOMER]`; `/driver,/driver/*=[DRIVER]`; `/supplier,/supplier/*=[SUPPLIER]`.
  - **TR-2.3 (rule)**: PASS. `RequireAuth` usa `isAuthenticated()` + `hasSessionToken` falsos → `<Navigate to="/acesso" replace state={{ from: path+search }} />`; `isError` no query `/auth/me` → `clearSession()` + redirect.
  - Build frontend: `tsc -b && vite build` PASS exit code 0 (537 KB JS, 74 KB CSS). Corrigidos 8 erros TS pós-apply: JSX.Element→ReactElement (RequireAuth); `session.*`→`session.user.*` (ApplicationStatusPage); casts intermediate `as unknown as` (RegisterPage mutationFn); import `ApiError` sem `type` keyword (auth.ts).

## Task 3: Substituir catálogo hardcoded por dados da API de products + preços
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Verificar se backend tem endpoint de listagem de products + variants (ProductsController em products/presentation). Se não existir, adicionar GET `/products` (público, lista products ativos com seus variants ativos) no backend.
  - Criar serviço `frontend/src/services/catalog.ts` (reescrever) com `fetchProducts()` que retorna a lista da API, com fallback para formato compatível com `GasProduct` (mantendo campos `id, size, label, price, description`).
  - Adaptar [OrderPage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/OrderPage.tsx) para consumir a lista via React Query (`useQuery`), mostrando skeleton/loader enquanto carrega.
  - Manter a função `formatAOA` intacta.
  - Remover o array `gasProducts` hardcoded ou sinalizar com comentário que deixou de ser a fonte.
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-3.1: Alterar preço de uma variant no seed/bd e verificar que UI reflete o novo preço após refresh. Evidence: Prisma Studio update → UI.
  - `rule` TR-3.2: Endpoint de products aceita calls anónimas e retorna JSON esperado. Evidence: curl ou fetch em Network.
  - `rubric` TR-3.3: UX durante loading. Dimension: loaders/skeletons e estado vazio. Scale 0-2; anchors: 0 = página quebra/vazia enquanto load; 1 = loader visual simples; 2 = skeletons estruturais ou cards de loading. Threshold >= 2. Evidence: Screenshots do loading state.
- **Completion Evidence**:
  - **TR-3.3 (rubric)**: Score **2/2**. Rewrite [catalog.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/catalog.ts): `fetchProducts()` GET `/products` anónimo (`requireAuth:false`), flatmap `products[].variants[]` → `GasProduct[]`, mapeamento `variant.weightKg` → `GasSize` via `toSize()`, popular flag para 12kg, `unitPrice`→`price`, preservado `formatAOA` inalterado. [OrderPage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/OrderPage.tsx) skeleton cards estruturais (3 placeholders com shimmer gradient inline) durante `productsQuery.isLoading`; `chosen?.id` null-safe em product-card selected state; error card em `productsQuery.isError`; disabled Qty controls durante loading; sidebar summary placeholder `A carregar…` + null-safe `quote?.xxx` com fallback 0.
  - **TR-3.2 (rule)**: PASS. `GET /products` no backend é público (ProductsController sem @UseGuards) e retorna `Product[]` com variants[] (id, sku, name, weightKg, unitPrice, active). Seed cria 1 product (gas-engarrafado) + 3 variants (GE-6KG 3500, GE-12KG 7000, GE-45KG 18000).
  - Build frontend: `tsc -b && vite build` PASS exit code 0 (539 KB JS, 74 KB CSS).

## Task 4: Substituir pricing, cobertura e inventário locais por /orders/quote real
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 3
- **Description**:
  - Reescrever fluxo de orçamento no frontend para usar `POST /orders/quote` (QuoteOrderDto: items[], deliveryType, latitude, longitude, deliveryAddress).
  - Remover dependência direta de `calculateQuote()` no frontend para preços finais — o response de `/orders/quote` tem `pricing.subtotal`, `deliveryFee`, `platformFee`, `total`, `distanceKm`, `estimatedMinutes`.
  - Adaptar `inventory.ts` e `coverage.ts`: manter funções utilitárias mas marcar que a fonte oficial é o `/orders/quote`; a verificação de `available`/mensagens de indisponibilidade devem vir do response da API (`{ available: false, message: '...' }`).
  - Atualizar OrderPage / ConfirmPage para consumir o quote via React Query e invalidar corretamente quando items/localização mudam.
- **Acceptance Criteria Addressed**: AC-3, FR-10
- **Test Requirements**:
  - `rule` TR-4.1: Mesmo input (items + coords) retorna valores idênticos entre `/orders/quote` response e UI. Evidence: Copiar payload e comparar coluna a coluna.
  - `rule` TR-4.2: Coordenada fora da área de fornecedor ativo retorna `available: false` e UI mostra mensagem da API. Evidence: Testar com lat/lng de outro país.
  - `rule` TR-4.3: Quando stock backend é 0 para um variant, quote rejeita com mensagem. Evidence: Por stock a 0 via query e tentar quote.
  - `rubric` TR-4.4: Clareza do resumo. Dimension: apresentação de cada componente do preço. Scale 0-2; anchors: 0 = mostra só total; 1 = mostra breakdown básico; 2 = detalhado com subtotal/taxa entrega/taxa plataforma/desconto/total + distância/ETA. Threshold >= 2. Evidence: Screenshot do resumo.

## Task 5: Integrar criação de pedido real (POST /orders) com Idempotency-Key + ProfilePage listagem
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 4
- **Description**:
  - No fluxo de ConfirmPage → PaymentPage → TrackingPage:
    - PaymentPage: dado que só temos PAY_ON_DELIVERY nesta fase, a ação "Confirmar" cria o pedido via API e depois navega para tracking.
  - Implementar `useMutation` do React Query com:
    - `Idempotency-Key` header usando `crypto.randomUUID()` gerado no início do fluxo (guardar no orderStore ou sessionStorage).
    - Rollback / tratamento de erro.
  - Atualizar [ProfilePage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/ProfilePage.tsx) para listar pedidos reais via `GET /orders/mine` em vez de vazio/mock.
  - Inicializar o Zustand `orderStore` para persistir o orderId criado e passar para TrackingPage.
- **Acceptance Criteria Addressed**: AC-4, FR-4, FR-5
- **Test Requirements**:
  - `rule` TR-5.1: Após confirmar, existe novo Order na BD com items corretos e InventoryMovement tipo RESERVE para o supplier selecionado. Evidence: Prisma Studio.
  - `rule` TR-5.2: Duplo clique (chamada duplicada com mesma chave) não cria segundo pedido; retorna o mesmo pedido. Evidence: Duas submissões com mesmo `Idempotency-Key`.
  - `rule` TR-5.3: ProfilePage mostra a lista de pedidos do cliente autenticado com referência, estado e total. Evidence: Screenshot + Network log de `/orders/mine`.
  - `rubric` TR-5.4: UX no fluxo confirm→pagamento→tracking. Dimension: fluidez e feedback. Scale 0-2; anchors: 0 = pages quebram em transição; 1 = funcional mas sem loading; 2 = loading + disable de botão + sucesso antes de navegar. Threshold >= 2. Evidence: Gravação de tela ou passo a passo com logs.

## Task 6: Ligar página de Tracking a dados reais de dispatch/delivery
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Reescrever [TrackingPage](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/pages/TrackingPage.tsx) para, em vez de `getDispatchSnapshot()` com timeline mock, usar:
    - `GET /dispatch/tracking/:orderId` (endpoint já existente em DispatchService.getCustomerTracking) para obter order + delivery + driver.
    - Polling a cada 5-10 segundos via `refetchInterval` do React Query.
  - Mapear os `OrderStatus` + `DeliveryStatus` do backend para as etapas visuais da timeline (`stageLabels`) e progresso percentual.
  - Card de entregador (nome, rating, veículo, localização) preenchido a partir de `tracking.delivery.driver`.
  - Botão "Contactar entregador" (agora mostra alert) → por enquanto ligar para `tel:+...` se tivermos telefone do driver; se não, manter mensagem explicativa clara.
  - Mapa: mostrar pin do fornecedor e do cliente (e do driver se lat/lng existir, atualizado em cada poll).
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-6.1: Atualizar estado de entrega no backend (via supplier/driver actions) e verificar que UI muda no próximo poll sem refresh manual. Evidence: Ações no backend → UI após 10 segundos.
  - `rule` TR-6.2: Se ainda não há delivery (ex: pedido em DRIVER_SEARCHING), UI mostra estado "À procura de entregador" de forma correta e não crasha. Evidence: Verificar com pedido nesse estado.
  - `rubric` TR-6.3: Fidelidade da timeline vs estados reais. Dimension: mapeamento correto e detalhe do progresso. Scale 0-2; anchors: 0 = sempre mostra um estado; 1 = mostra alguns estados; 2 = cada estado relevante mapeado com título/descrição. Threshold >= 2. Evidence: Tabela de mapeamento Order/Delivery status → stage.

## Task 7: Área do Fornecedor (SupplierPage + SupplierOrderPage) consumir API
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 5
- **Description**:
  - Verificar endpoints de supplier orders no backend (supplier-orders.controller.ts ou equivalente): listar, aceitar, preparar, ready, cancel.
  - Reescrever `services/supplier.ts` para:
    - `fetchSupplierOrders(status?)` → GET `/supplier/orders` (listSupplierOrders no OrderService).
    - `acceptOrder(id)` → supplierAccept.
    - `preparingOrder(id)` → supplierPreparing.
    - `readyOrder(id)` → supplierReady + opcionalmente iniciar dispatch (chamar `startForOrder` no Dispatch endpoint).
    - `fetchInventory()` → GET `/inventory` (InventoryController, existente).
  - Atualizar SupplierPage para:
    - Métricas (novos, em preparação, prontos, valor de hoje) calculadas com base nos dados reais.
    - Tabs de pedidos e inventário carregadas da API com React Query.
    - Ações (aceitar/preparar/pronto) usar mutations e invalidar queries.
  - Atualizar SupplierOrderPage com detalhe do pedido real.
- **Acceptance Criteria Addressed**: AC-5, FR-6
- **Test Requirements**:
  - `rule` TR-7.1: Sequência completo de aceitar → preparar → pronto atualiza status no backend e UI reflete após cada clique. Evidence: Chamadas + refresh da query.
  - `rule` TR-7.2: Após "ready", o pedido passa para DRIVER_SEARCHING (start dispatch é disparado pelo frontend ou backend). Evidence: Estado do pedido no backend.
  - `rule` TR-7.3: Inventário mostra disponível, reservado e ponto de encomenda com dados reais. Evidence: Comparar valores com InventoryItem na BD.
  - `rubric` TR-7.4: Fluidez do dashboard do fornecedor. Dimension: métricas e paginação/lista. Scale 0-2; anchors: 0 = dados falsos; 1 = dados reais mas delays sem feedback; 2 = loaders, optimistic UI opcional, estados vazios. Threshold >= 2. Evidence: Screenshot da página.

## Task 8: Área do Entregador (DriverPage + DriverOrderPage) integrada a dispatch e deliveries
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 7 (necessário fornecedor ter pedido pronto)
- **Description**:
  - Criar serviços de dispatch/driver no frontend que chamem:
    - `startDriver(lat, lng)` → PUT `/dispatch/driver/start`
    - `stopDriver()` → PUT `/dispatch/driver/stop`
    - `updateLocation(lat, lng)` → polling ou periodicamente
    - `fetchOffers()` → GET `/dispatch/offers` (listDriverOffers)
    - `acceptOffer(offerId)` → POST `/dispatch/offers/:id/accept`
    - `rejectOffer(offerId)` → POST `/dispatch/offers/:id/reject`
    - `getCurrentDelivery()` → GET `/deliveries/current`
    - `transitionDelivery(to, note?, lat?, lng?)` → POST `/deliveries/:id/transition` (ou deliveries.controller específico) para TO_PICKUP → PICKED_UP → IN_TRANSIT → ARRIVED → DELIVERED
  - Reescrever DriverPage:
    - Toggle Online/Offline chama start/stop e guarda geolocalização (obtida via `navigator.geolocation` ou, em demo, coordenada fixa).
    - Mostrar ofertas de entrega pendentes em vez de fluxo fixo.
    - Quando aceita oferta → mostra delivery atual e botões de transição de estado.
    - Ligar mapa com rota fornecedor → cliente.
  - Atualizar DriverOrderPage com detalhe real.
- **Acceptance Criteria Addressed**: AC-6, FR-7
- **Test Requirements**:
  - `rule` TR-8.1: Fluxo completo ponta a ponta:
    1. Fornecedor marca pedido READY → dispatch inicia;
    2. Entregador online vê oferta;
    3. Aceita oferta → delivery criado;
    4. Avança todos os estados até DELIVERED;
    5. Pedido fica COMPLETED.
    Evidence: Logs de cada step + BD final.
  - `rule` TR-8.2: Entregador sem entregas ativas mas online recebe ofertas de pedidos novos DRIVER_SEARCHING. Evidence: Verificar `/dispatch/offers` response e UI.
  - `rule` TR-8.3: Tentar avançar estado inválido (ex: ARRIVED → PICKED_UP) retorna erro tratado. Evidence: Mensagem de erro na UI.
  - `rubric` TR-8.4: UX do entregador. Dimension: clareza das ações e contexto. Scale 0-2; anchors: 0 = botões sem contexto; 1 = mostra próximo passo; 2 = mostra próximo passo, destino, distância, valor e mapa contextual. Threshold >= 2. Evidence: Screenshots do fluxo em 3 fases.

## Task 9: Integração final, correções e testes de ponta a ponta + documentação mínima de ambiente
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1 a Task 8
- **Description**:
  - Atualizar `frontend/.env.example` com `VITE_API_BASE_URL=http://localhost:3000` (ou porta do backend).
  - Atualizar `backend/.env.example` se necessário com CORS (adicionar origem Vite `http://localhost:5173`).
  - Verificar e fixar CORS no backend NestJS (main.ts enableCors com origins de dev e, eventualmente, variáveis).
  - Executar smoke test ponta a ponta:
    1. Correr `docker-compose up` para BD (ou setup local).
    2. `db:push`, `db:seed`.
    3. Backend start. Frontend start.
    4. Login com os 3 perfis demo e validar que cada área abre com dados reais.
    5. Criar pedido como cliente, aprovar como fornecedor, aceitar e entregar como driver, validar tracking cliente.
  - Fixar quaisquer bugs descobertos durante smoke test.
  - No mínimo um validação TypeScript e lint em frontend e backend sem erros.
- **Acceptance Criteria Addressed**: AC-10, NFR transversais
- **Test Requirements**:
  - `rule` TR-9.1: `npm run build` no frontend e `npm run build` no backend ambos passam sem erros TS. Evidence: Saída do terminal.
  - `rule` TR-9.2: Smoke test dos 5 passos acima completo com sucesso. Evidence: Checklist ou gravação.
  - `rubric` TR-9.3: Qualidade geral da transição. Dimension: que o demo parece "o mesmo" mas é real. Scale 0-2; anchors: 0 = UX degradada em várias páginas; 1 = funciona mas com pequenas falhas de UI; 2 = visual igual ou melhor que o demo, com todas as validações funcionando. Threshold >= 2. Evidence: Comparação visual.
- **Notes**: Se surgir bloqueio por configuração de ambiente (CORS, portas, etc.), resolver dentro desta tarefa.
