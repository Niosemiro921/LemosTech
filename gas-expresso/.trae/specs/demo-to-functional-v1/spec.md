# Gás Expresso — Transição Demo → Funcional (V1)

## Overview
- **Summary**: Transformar o sistema gas-expresso de versão demo (dados mockados, fluxos locais, sem integração frontend↔backend) para uma versão funcional onde os fluxos de cliente, fornecedor e entregador operam sobre APIs reais, dados persistidos no PostgreSQL, e com segurança ativa em todos os endpoints.
- **Purpose**: Permitir que o produto seja utilizado em ambiente real com operações de pedidos, dispatch e entregas funcionais de ponta a ponta.
- **Target Users**: Clientes finais, fornecedores parceiros, entregadores cadastrados e equipe administrativa.

## Goals
1. Conectar o frontend React ao backend NestJS em todos os fluxos críticos (autenticação, catálogo, pedidos, dispatch, tracking).
2. Substituir dados mockados do frontend por dados reais da API (catálogo, inventário, cobertura, preços, pedidos por perfil).
3. Implementar autenticação real com JWT, proteção de rotas e persistência de sessão com token.
4. Garantir que os ciclos de vida de pedido, entrega e dispatch funcionem ponta a ponta via UI.
5. Criar a camada de integração HTTP no frontend com tratamento de erros, interceptadores e configuração de ambiente.

## Non-Goals
1. Integração com gateways de pagamento reais (Multicaixa Express, transferências). Mantém PAY_ON_DELIVERY como método funcional.
2. Implementação de módulos que existem apenas como README (commissions, compliance, maps, notifications, payments, promotions, ratings, support, vehicles, wallets) — estes ficam fora do escopo desta transição.
3. Sistema de avaliações/rating automático.
4. Notificações push ou WebSocket em tempo real. A atualização por polling é aceitável nesta fase.
5. Painel administrativo web UI; apenas os endpoints de admin (já existentes no backend) são considerados.

## Background & Context
O sistema já possui um backend NestJS robusto e funcional com os seguintes módulos **já implementados**:
- Auth (JWT, registo/login, roles e guards)
- Users / Customers / Drivers / Suppliers (perfis por role)
- Admin review de contas
- Products + ProductVariants
- Inventory com stock movements e reservas
- Orders com ciclo de vida completo e transações atómicas
- Dispatch com ofertas a motoristas e scoring
- Deliveries com transições de estado

O backend já está integrado ao Prisma + PostgreSQL com seed de dados demo.

O **desconecte** está no frontend React, que atualmente:
- Usa `createDemoUser()` em [auth.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/auth.ts#L41-L46) em vez de chamadas API reais.
- Catálogo hardcoded em [catalog.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/catalog.ts#L3-L7).
- Preços calculados localmente em [pricing.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/pricing.ts#L33-L58) em vez de `/orders/quote`.
- Inventário/fornecedores hardcoded em [inventory.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/inventory.ts#L26-L57).
- Cobertura hardcoded em [coverage.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/coverage.ts#L21-L26).
- Dispatch/tracking simulado por timeline em [dispatch.ts](file:///c:/Users/INFORCLICK/Documents/GitHub/LemosTech/gas-expresso/frontend/src/services/dispatch.ts#L5-L14).
- Páginas de Fornecedor e Entregador operam 100% com estado local/mock.

## Functional Requirements
- **FR-1**: Autenticação real no frontend com login/registo via API backend, persistência de JWT e proteção de rotas por role.
- **FR-2**: Catálogo de produtos carregado dinamicamente a partir do endpoint de products.
- **FR-3**: Orçamento (quote) de pedido via API `/orders/quote` com preços, taxa de entrega e taxa de plataforma do backend.
- **FR-4**: Criação de pedido real via API com stock reservado e persistência em BD.
- **FR-5**: Área do cliente: listar pedidos, ver detalhe, acompanhar estado.
- **FR-6**: Área do fornecedor: listar pedidos por estado, aceitar/preparar/colocar pronto, ver/atualizar inventário via API.
- **FR-7**: Área do entregador: ficar online/offline, receber ofertas de dispatch, aceitar/rejeitar, avançar estados da entrega via API.
- **FR-8**: Página de tracking (rastreio) alimentada por dados reais do pedido e entrega via API.
- **FR-9**: Camada HTTP client comum (base URL, interceptor de autenticação, tratamento de erros e timeouts).
- **FR-10**: Cobertura verificada por backend (o quote rejeita fornecedores sem stock/localização).

## Non-Functional Requirements
- **NFR-1 (Segurança)**: Todos os endpoints protegidos continuam a exigir JWT válido com role correto. O frontend envia o header `Authorization: Bearer <token>` automaticamente.
- **NFR-2 (Resiliência)**: Chamadas API com timeout e tratamento de erro consistente (erros de rede, 4xx, 5xx refletidos na UI).
- **NFR-3 (Configurabilidade)**: Base URL da API configurável via variável de ambiente (`VITE_API_BASE_URL`) sem mudanças de código por ambiente.
- **NFR-4 (Performance)**: Evitar duplicação de pedidos por duplo clique; utilizar `Idempotency-Key` no cabeçalho ao criar pedido.
- **NFR-5 (Compatibilidade)**: Mapeamento de tipos entre serviços antigos e novos sem quebrar as páginas existentes; funções de formatação como `formatAOA` mantêm-se.

## Constraints
- **Technical**: Manter a stack atual (NestJS + Prisma PostgreSQL no backend; React 18 + Vite + Zustand + React Query no frontend). Não introduzir novas dependências sem necessidade.
- **Business**: Moeda mantida em AOA (Kwanza angolano). Método de pagamento nesta fase continua apenas `PAY_ON_DELIVERY` (pagamento na entrega).
- **Dependencies**: Backend já disponível em porta configurada; Frontend usa Nominatim (OSM) para geocoding — mantém-se.

## Assumptions
1. O backend já tem os endpoints necessários implementados e funcionando (Orders, Dispatch, Deliveries, Auth, Inventory, Products) — a verificação é parte das tarefas.
2. Para atualização em tempo real do rastreio, polling periódico (a cada 5-10 segundos) é suficiente nesta fase.
3. O utilizador de demo no seed (`923000010`, `923000011`, `923000012`) pode ser usado nos testes locais.
4. O backend expõe CORS corretamente para a origem do frontend dev.

## Acceptance Criteria

### AC-1: Login e sessão real funcionam
- **Type**: `rule`
- **Given**: Backend de auth está disponível e seed foi executada
- **When**: Utilizador introduz `923000012` + senha demo no ecrã de login como Cliente
- **Then**: É feito POST a `/auth/login`, recebe JWT, guarda token e user em sessão, é redirecionado para `/perfil` e `/perfil` mostra os dados reais da conta
- **Pass Condition**: (1) O pedido `/auth/login` retorna 200 com accessToken; (2) Um pedido subsequente a um endpoint protegido (ex: `/orders/mine`) com o token retorna 200 e não 401; (3) Ao fazer logout e voltar a abrir, a sessão só persiste se o token for válido.
- **Evidence**: DevTools Network tab mostrando login com sucesso, chamada a `/orders/mine` autorizada, página de perfil mostrando dados reais.

### AC-2: Catálogo vem da API products
- **Type**: `rule`
- **Given**: Backend com products e variants seedados
- **When**: Página de pedido (`/pedir`) carrega
- **Then**: Os produtos (6/12/45 KG) e preços mostrados vieram de `/products` (ou similar) e não do array hardcoded
- **Pass Condition**: (1) Não há referências a `gasProducts` hardcoded na página de pedido; (2) Alterar um preço no backend (via seed atualizado) reflete-se na UI após refresh.
- **Evidence**: Network log mostrando chamada a products endpoint, pré-condição vs pós-condição do preço.

### AC-3: Orçamento vem de /orders/quote
- **Type**: `rule`
- **Given**: Utilizador selecionou produto, quantidade e localização com cobertura
- **When**: Clica em avançar para o resumo
- **Then**: UI faz POST a `/orders/quote` com items e coordenadas e mostra subtotal, deliveryFee, platformFee, total calculados pelo backend
- **Pass Condition**: (1) A função `calculateQuote` do frontend deixa de ser a fonte do total; (2) Valores mostrados no resumo são idênticos ao response de `/orders/quote`.
- **Evidence**: Comparação lado a lado do payload de rede e da UI.

### AC-4: Criar pedido persiste e reserva stock
- **Type**: `rule`
- **Given**: Orçamento válido, utilizador cliente autenticado
- **When**: Clica em "Confirmar pedido" com Idempotency-Key
- **Then**: (1) Pedido é criado na BD com status AWAITING_SUPPLIER_ACCEPTANCE; (2) Inventário do fornecedor tem reservedQty incrementado; (3) UI mostra referência do pedido real e avança para a página de tracking.
- **Pass Condition**: Query ao Prisma Studio confirma nova row em Order + OrderItem + InventoryMovement tipo RESERVE; duplicar o clique com mesma key não cria 2 pedidos.
- **Evidence**: Captura do pedido na BD, inventário atualizado, pedido duplicado com 409/retorno do mesmo pedido.

### AC-5: Fornecedor pode aceitar, preparar e marcar como pronto via API
- **Type**: `rule`
- **Given**: Fornecedor autenticado (923000010), pedido em AWAITING_SUPPLIER_ACCEPTANCE
- **When**: Na área de fornecedor, clica sucessivamente em Aceitar → Preparar → Pronto
- **Then**: O estado do pedido avança e reflete no backend; o dispatch torna-se iniciável (READY_FOR_PICKUP → DRIVER_SEARCHING)
- **Pass Condition**: (1) `/supplier/orders` endpoints retornam o novo estado após cada ação; (2) UI não manipula apenas estado local.
- **Evidence**: Sequência de chamadas + verificação no status do pedido via BD.

### AC-6: Entregador pode aceitar oferta e avançar entrega
- **Type**: `rule`
- **Given**: Entregador online, dispatch tem ofertas pendentes, entregador autenticado
- **When**: Entregador aceita uma oferta e depois avança TO_PICKUP → PICKED_UP → IN_TRANSIT → ARRIVED → DELIVERED
- **Then**: Delivery criado/atualizado, pedido correspondente avança de estado, e no fim o pedido fica COMPLETED
- **Pass Condition**: Todos os estados registados em DeliveryStatusHistory e OrderStatusHistory; página de cliente vê os estados atualizados via tracking.
- **Evidence**: Fluxo completo registado na BD e refletido em 3 visões (entregador, fornecedor, cliente).

### AC-7: Página de Rastreio (tracking) reflete dados reais
- **Type**: `rule`
- **Given**: Existe um pedido com entrega associada
- **When**: Cliente abre `/rastrear` com o orderId real
- **Then**: A timeline, o progresso, os dados do entregador e do fornecedor são carregados da API `/dispatch/tracking/:orderId` e não da timeline mock
- **Pass Condition**: Não há chamada a `getDispatchSnapshot` com timeline hardcoded; os dados mudam quando o estado do pedido muda no backend.
- **Evidence**: Screenshot da página e payload JSON correspondente da API.

### AC-8: Rotas protegidas por role no frontend
- **Type**: `rule`
- **Given**: Utilizador com role CUSTOMER
- **When**: Tenta navegar diretamente para `/driver` ou `/supplier`
- **Then**: É redirecionado para a página correta da sua role ou para login se não autenticado
- **Pass Condition**: (1) Guard de rota implementado no React Router; (2) Tentativa de acesso a rota de outra role é bloqueada.
- **Evidence**: Navegação manual em 3 cenários (não autenticado, role errada, role correta).

### AC-9: Cobertura e arquitetura da camada HTTP
- **Type**: `rubric`
- **Dimension**: Qualidade da camada de integração frontend↔backend
- **Scale**: 0-2
- **Anchors**: 0 = cada serviço faz fetch manual sem token, sem tratamento de erro; 1 = client HTTP comum existe mas sem interceptors/tratamento unificado; 2 = client HTTP com config de ambiente, interceptor JWT, parsing de erros normalizado e timeout.
- **Pass Threshold**: >= 2
- **Evidence**: Código da camada de client HTTP (`/frontend/src/lib/api.ts` ou similar) e sua utilização nos serviços.

### AC-10: Continuidade UX e qualidade da transição
- **Type**: `rubric`
- **Dimension**: Grau em que a UX do demo é preservada ou melhorada ao ligar à API real
- **Scale**: 0-2
- **Anchors**: 0 = UI quebra ou fica visualmente degradada; 1 = funciona mas sem loaders/erros amigáveis; 2 = loaders durante fetch, estados de erro e vazio apresentados de forma clara, fluxos visualmente iguais ao demo.
- **Pass Threshold**: >= 2
- **Evidence**: Comparação visual do demo vs versão funcional em cada página principal.

## Open Questions
- [ ] O frontend deve usar `@tanstack/react-query` (já instalado) como camada de cache e data fetching, ou apenas fetch/zustand? → Assumido: usar React Query por já estar em dependências.
- [ ] Endpoint de listagem de products existe ou precisa ser criado no backend? A verificar durante a tarefa 3.
- [ ] Existe endpoint específico de customer/driver/supplier para obter o perfil ou usamos `/auth/me` + tabela de perfil? → Assumido: `/auth/me` + endpoints específicos se existirem.
- [ ] Qual a porta default do backend? (Tipicamente 3000) → a confirmar via `.env.example`.
