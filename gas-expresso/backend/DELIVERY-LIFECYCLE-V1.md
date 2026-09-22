# Gás Expresso — Delivery Lifecycle V1

## Objetivo

Completar o ciclo operacional do entregador depois do aceite do dispatch:

```text
DRIVER_ACCEPTED
  ↓
TO_PICKUP
  ↓
AT_PICKUP
  ↓
PICKED_UP
  ↓
IN_TRANSIT
  ↓
ARRIVED
  ↓
DELIVERED
  ↓
COMPLETED
```

## Endpoints do entregador

```http
GET  /api/v1/drivers/me/deliveries/current
GET  /api/v1/drivers/me/deliveries/:deliveryId

POST /api/v1/drivers/me/deliveries/:deliveryId/to-pickup
POST /api/v1/drivers/me/deliveries/:deliveryId/at-pickup
POST /api/v1/drivers/me/deliveries/:deliveryId/picked-up
POST /api/v1/drivers/me/deliveries/:deliveryId/in-transit
POST /api/v1/drivers/me/deliveries/:deliveryId/arrived
POST /api/v1/drivers/me/deliveries/:deliveryId/delivered
```

## Segurança

Todos os endpoints exigem JWT + DRIVER + conta ACTIVE e a entrega precisa pertencer ao entregador autenticado.

## Concorrência

Cada transição usa atualização condicional dentro de transação PostgreSQL. Se outro processo alterar o estado primeiro, a operação falha em vez de sobrescrever o estado.

## Histórico

Cada transição gera `DeliveryStatusHistory`, com nota opcional e localização opcional do entregador.

## Pedido

Quando a entrega avança para `PICKED_UP`, `IN_TRANSIT`, `ARRIVED` ou `DELIVERED`, o estado do pedido é sincronizado. Na transição `DELIVERED`, o pedido passa em seguida para `COMPLETED`.

## Pagamento

O método continua `PAY_ON_DELIVERY`. A conclusão da entrega não pretende confirmar um pagamento online.
