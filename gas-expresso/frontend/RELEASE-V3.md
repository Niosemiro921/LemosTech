# Gás Expresso Frontend 3.0.0 — Release

## Escopo
Refatoração do frontend por perfil, sem fixtures, mocks ou dados operacionais inventados.

## Perfis e acesso
- Cliente: `/perfil`, `/pedir`, `/rastrear`, `/enderecos`.
- Entregador: `/driver`, `/driver/pedidos`, `/driver/saldo`, `/driver/ganhos`, `/driver/perfil`, `/driver/documentos`, `/driver/incidentes`.
- Fornecedor/Empresa: `/fornecedor` e módulos ERP/CRM.
- Prestador: `/prestador`.
- Admin: `/admin`, parceiros, pedidos, dispatch, auditoria e fila de recargas.
- `Pedir gás` e `Rastrear` só existem no menu do Cliente e estão protegidos nas rotas.

## Operação do entregador
- Mobile-first.
- Online/offline sincronizado com a API.
- Geolocation API usada apenas enquanto online.
- Posição própria atualizada no mapa imediatamente e enviada ao servidor com throttle.
- Ofertas carregadas de `/drivers/me/offers`, ordenadas por `distanceToPickupKm` e filtráveis por `VITE_DRIVER_OFFER_RADIUS_KM`.
- Aceitar/recusar usa os endpoints existentes.
- Carteira, saldo disponível, saldo reservado, mínimo operacional, prioridade e política vêm da API.
- A recarga cria uma solicitação no endpoint existente e aguarda confirmação do servidor.
- Levantamento só é mostrado/ativado quando o endpoint real for configurado; nenhum endpoint fictício é chamado.

## Cliente e tracking
- Tracking usa `/orders/mine/{id}/tracking` e WebSocket configurável em `VITE_REALTIME_URL`.
- Existe polling de fallback para manter a operação utilizável quando realtime não estiver disponível.
- A posição só é exibida durante entrega activa.

## Fornecedor / ERP + CRM
- Shell separado com sidebar.
- Dashboard, Stock, Pedidos e páginas de módulos ERP/CRM.
- Módulos sem endpoint identificado mostram integração pendente, sem tabelas, gráficos ou KPIs fictícios.

## Validação local feita no pacote
- 67 ficheiros TypeScript/TSX analisados.
- 0 erros de sintaxe.
- 401 classes CSS identificadas como usadas e 0 classes sem regra CSS correspondente.
- Busca de termos de mock/fixture/fake hardcoded em `src` sem resultados de dados operacionais.

## Instalação no Windows
```powershell
npm ci
npm run typecheck
npm run build
npm run dev
```

API padrão:
`http://localhost:5048/api/v1`
