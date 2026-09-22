# Gás Expresso — Products, Inventory & Orders V2

## Objetivo
Ligar o fluxo de compra do frontend ao backend com catálogo, stock, seleção de fornecedor, cotação, criação transacional do pedido e reserva de stock.

## Fluxo
1. `GET /api/v1/products`
2. Cliente escolhe uma variação.
3. `POST /api/v1/orders/quote`
4. Backend procura fornecedor ativo com stock suficiente e localização conhecida.
5. Backend calcula preço, entrega, comissão e ETA preliminar.
6. `POST /api/v1/orders` com `Idempotency-Key`.
7. PostgreSQL reserva stock dentro de uma transação.
8. Pedido entra em `AWAITING_SUPPLIER_ACCEPTANCE`.
9. Fornecedor aceita, prepara e marca pronto.
10. Próxima fase: Dispatch/Driver.

## Comissão
`platformFee` fica congelada no pedido. O cálculo padrão de desenvolvimento é 8% do subtotal e pode ser alterado por `PLATFORM_COMMISSION_RATE`.

## Pagamento
V1: `PAY_ON_DELIVERY`. Não há integração Multicaixa Express neste momento.

## Segurança
Rotas de fornecedor exigem JWT + role SUPPLIER + conta ACTIVE. Rotas de cliente exigem JWT + role CUSTOMER + conta ACTIVE. Operações protegidas do catálogo exigem ADMIN.

## Concorrência
A reserva usa `updateMany` com `availableQty >= quantidade`. Isto impede que o mesmo stock disponível seja reservado abaixo de zero em concorrência normal. A `Idempotency-Key` impede duplicação por repetição do mesmo pedido pelo cliente.

## Configuração
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN`
- `JWT_EXPIRES_IN`
- `PLATFORM_COMMISSION_RATE`
