# Gás Expresso — Dispatch V1

Esta etapa liga o pedido pronto para recolha ao primeiro ciclo operacional do entregador.

## Fluxo

```text
READY_FOR_PICKUP
       ↓
DRIVER_SEARCHING
       ↓
Encontrar entregadores elegíveis
       ↓
Criar ofertas temporárias
       ↓
Entregador aceita/recusa
       ↓
DRIVER_ACCEPTED
       ↓
Delivery ASSIGNED
```

## Regras da V1

- Apenas entregadores com conta `ACTIVE` podem operar.
- O entregador deve estar `isOnline=true` e ter latitude/longitude recentes.
- O veículo precisa suportar o peso total do pedido.
- O candidato deve estar dentro de `DISPATCH_RADIUS_KM`.
- A oferta expira após `DISPATCH_OFFER_TTL_SECONDS`.
- Vários entregadores podem receber a mesma vaga; apenas um consegue assumir o pedido.
- A aceitação usa atualização condicional do pedido dentro de transação para evitar dupla atribuição concorrente.
- Ao aceitar uma oferta, as restantes ofertas pendentes do mesmo pedido são rejeitadas.

## Endpoints

### Fornecedor/Admin

`POST /api/v1/dispatch/orders/:orderId/start`

Fornecedor só pode iniciar o dispatch dos próprios pedidos. Admin pode iniciar qualquer pedido permitido.

Body opcional:

```json
{ "maxOffers": 3 }
```

### Entregador

`POST /api/v1/drivers/me/online`

```json
{ "latitude": -8.839, "longitude": 13.289 }
```

`POST /api/v1/drivers/me/offline`

`POST /api/v1/drivers/me/location`

```json
{ "latitude": -8.841, "longitude": 13.291 }
```

`GET /api/v1/drivers/me/offers`

`POST /api/v1/drivers/me/offers/:offerId/accept`

`POST /api/v1/drivers/me/offers/:offerId/reject`

### Cliente

`GET /api/v1/orders/mine/:orderId/tracking`

Este endpoint passa a devolver o pedido mais a entrega e a localização atual do entregador quando já houver atribuição.

## Variáveis de ambiente

```env
DISPATCH_RADIUS_KM=15
DISPATCH_OFFER_TTL_SECONDS=30
```

Os valores servem para desenvolvimento e podem ser alterados sem mudar o código.
