# Matriz de acesso — Gás Expresso 3.0.0

| Perfil | Área | Pode ver Pedir gás | Pode ver Rastreamento | Logout |
|---|---|---:|---:|---:|
| CUSTOMER | `/perfil` | Sim | Sim | Sim |
| DRIVER | `/driver` | Não | Não | Sim |
| SUPPLIER | `/fornecedor` | Não | Não | Sim |
| ADMIN | `/admin` | Não | Não | Sim |

As permissões são aplicadas em menus e, principalmente, nas rotas através de `RequireAuth`.
O frontend só oferece os papéis definidos no enum de utilizadores do backend.

## Entregador

Menu inferior: Início · Pedidos · Carteira · Histórico · Perfil. O histórico mostra os 100 registos concluídos mais recentes, com 90% da taxa de entrega acumulada para o entregador.

Pedidos disponíveis vêm de `/drivers/me/offers`, são ordenados por `distanceToPickupKm` e podem ser limitados por `VITE_DRIVER_OFFER_RADIUS_KM`.

Localização do dispositivo só é enviada para `/drivers/me/location` enquanto o perfil estiver online.

## Empresa

Sidebar independente com ERP e CRM. Os módulos sem contrato identificado não apresentam dados fictícios.
