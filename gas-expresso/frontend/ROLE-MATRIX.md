# Matriz de acesso — Gás Expresso 3.0.0

| Perfil | Área | Pode ver Pedir gás | Pode ver Rastreamento | Logout |
|---|---|---:|---:|---:|
| CUSTOMER | `/perfil` | Sim | Sim | Sim |
| DRIVER | `/driver` | Não | Não | Sim |
| SUPPLIER | `/fornecedor` | Não | Não | Sim |
| PRESTADOR | `/prestador` | Não | Não | Sim |
| ADMIN | `/admin` | Não | Não | Sim |

As permissões são aplicadas em menus e, principalmente, nas rotas através de `RequireAuth`.

## Entregador

Menu inferior: Início · Pedidos · Carteira · Histórico · Perfil.

Pedidos disponíveis vêm de `/drivers/me/offers`, são ordenados por `distanceToPickupKm` e podem ser limitados por `VITE_DRIVER_OFFER_RADIUS_KM`.

Localização do dispositivo só é enviada para `/drivers/me/location` enquanto o perfil estiver online.

## Empresa

Sidebar independente com ERP e CRM. Os módulos sem contrato identificado não apresentam dados fictícios.
