# Gás Expresso — Contrato de integração V2

O frontend desta versão adiciona e utiliza contratos para áreas que não estavam disponíveis no contrato V1. As páginas não criam dados locais para simular sucesso. Quando um endpoint não existe, a interface apresenta indisponibilidade de integração.

## Rastreio em tempo real

`GET /orders/mine/{orderId}/tracking`

Resposta mínima:

```json
{
  "order": { "id": "...", "reference": "GE-...", "status": "IN_TRANSIT", "deliveryAddress": "...", "latitude": -8.8, "longitude": 13.2, "createdAt": "..." },
  "delivery": {
    "status": "IN_TRANSIT",
    "estimatedMinutes": 8,
    "distanceKm": 2.4,
    "driver": { "id": "...", "fullName": "...", "phone": "+244...", "vehicleType": "...", "latitude": -8.8, "longitude": 13.2, "ratingAverage": 4.9, "lastLocationAt": "..." }
  }
}
```

Quando `VITE_REALTIME_URL` estiver configurada, o frontend abre `ws(s)://.../orders/{orderId}`. Eventos devem transportar o mesmo objeto de tracking, permitindo atualizar o marcador sem recarregar a página. O polling continua como fallback.

O backend NestJS deste projeto ainda não disponibiliza o gateway WebSocket; mantenha `VITE_REALTIME_URL` vazia para usar polling.

## Saldo operacional do entregador

`GET /drivers/me/wallet`
`GET /drivers/me/wallet/transactions`
`POST /drivers/me/wallet/top-ups`
`GET /drivers/me/wallet/priority-policy`

A recarga só passa a contar no saldo após confirmação no servidor. O frontend nunca altera o saldo localmente para autorizar o entregador.
O fluxo atual cria uma solicitação pendente e depende de confirmação manual administrativa; ainda não existe integração com um provedor de pagamento. Sem saldo mínimo confirmado, o servidor recusa colocar o entregador online ou recomendá-lo para uma oferta.

O objeto wallet deve devolver pelo menos:

```json
{ "currency": "AOA", "balance": 30000, "reservedBalance": 0, "availableBalance": 30000, "minimumOperatingBalance": 10000, "priorityScore": 78, "priorityBand": "PRO", "updatedAt": "..." }
```

## Ganhos acumulados do entregador

`GET /drivers/me/earnings` lista até as 100 entregas concluídas mais recentes do entregador autenticado.

- `gross`: taxa de entrega cobrada no pedido.
- `net`: 90% da taxa de entrega, arredondado ao kwanza mais próximo.
- `platformFee`: restante da taxa após o arredondamento do valor do entregador.
- `status`: `ACCRUED`; o valor acumula após a entrega, mas não significa levantamento nem crédito na carteira operacional.
- `createdAt`: instante em que a entrega foi concluída.

## Regra de despacho

A recomendação deve ser calculada no backend. O saldo operacional pode aumentar a prioridade comercial, mas nunca deve ultrapassar restrições de elegibilidade, segurança, proximidade, capacidade ou qualidade.

Quando a continuidade estiver activa, um entregador que já realizou entregas para o mesmo cliente pode receber um bónus de continuidade **apenas se continuar elegível**. Não é permitido fixar para sempre um único entregador.

O endpoint de administração devolve a recomendação actual:

`GET /admin/dispatch/queue`

Cada item pode incluir `recommendedDriver` com `id`, `name`, `priorityScore`, `balance` e `distanceKm`.

## Documentos

Entregador:

`GET /drivers/me/documents`
`POST /drivers/me/documents/{id}/review`

Empresa:

`GET /suppliers/me/documents`
`POST /suppliers/me/documents/{id}/review`

A API deve validar estado, tipo, datas de validade e notas da equipa. O frontend apenas apresenta o estado recebido.

## Incidentes

`GET /incidents/mine`
`POST /incidents`

Campos mínimos de criação: `category`, `severity`, `description`; `orderId` é opcional.

## Cliente

`GET /customers/me/addresses`
`POST /customers/me/addresses`
`PATCH /customers/me/addresses/{id}`
`DELETE /customers/me/addresses/{id}`

`GET /notifications`
`POST /notifications/{id}/read`
`POST /notifications/read-all`

`GET /support/tickets`
`POST /support/tickets`

## Empresa

`GET /suppliers/me/team`
`GET /suppliers/me/schedule`
`PATCH /suppliers/me/schedule`

## Stock da empresa

`GET /suppliers/me/inventory` — inventário da empresa autenticada.
`PATCH /suppliers/me/inventory` — cria ou atualiza a linha de inventário de uma variante.

O corpo exige `variantId` (UUID da `ProductVariant`), `availableQty` (inteiro ≥ 0) e aceita `reorderLevel` (inteiro ≥ 0) e `note` (texto do movimento). A `availableQty` nunca pode ficar abaixo do `reservedQty`.

`GET /suppliers/me/inventory/movements` — livro de movimentos do stock da empresa.

Cada movimento devolve `id`, `type` (`RESERVE`, `RELEASE` ou `ADJUSTMENT`), `quantity`, `note`, `createdAt`, `orderId`, `orderReference`, `variantId`, `variantName` e `variantSku`. A lista vem ordenada do mais recente para o mais antigo.

- `RESERVE` — stock reservado por um pedido criado.
- `RELEASE` — saída por entrega (`DELIVERED`/`COMPLETED`) ou devolução por cancelamento.
- `ADJUSTMENT` — ajuste manual feito pelo fornecedor.

## Pagamentos e despesas da empresa

`GET /suppliers/me/payments` — faturas de venda já pagas.
`GET /suppliers/me/expenses` — faturas de compra por liquidar.

Ambos devolvem `{ "currency": "AOA", "items": [...], "total": number }`. Cada item tem `id`, `reference`, `amount`, `date`, `status` e `description`.

O modelo de negócio do lançamento é `PAY_ON_DELIVERY`: o pagamento é confirmado na entrega e não existe integração com provedor externo.

## Analytics

`POST /analytics/events` — regista um evento de navegação ou clique. Não exige autenticação.

O corpo exige `sessionId` (máx. 100 caracteres), `eventType` (`PAGE_VIEW` ou `CLICK`), `area` (`CUSTOMER`, `DRIVER`, `SUPPLIER`, `ADMIN` ou `PUBLIC`) e `path` (máx. 255). O `target` (máx. 100) é opcional.

`GET /analytics/summary` — resumo agregado. **Exige `ADMIN`.** Aceita `area` e `sessionId` como filtros opcionais.

Devolve `{ "counts": [{ "eventType": "...", "area": "...", "_count": { "id": number } }], "total": number }`.

O tracker do frontend nunca envia conteúdo de campos, palavras-passe, telefone ou endereço, e a falha de analytics nunca bloqueia a jornada do utilizador.

## Backoffice

`GET /admin/overview`
`GET /admin/partners?type=DRIVER|SUPPLIER`
`POST /admin/partners/{id}/approve`
`POST /admin/partners/{id}/reject`
`POST /admin/partners/{id}/suspend`
`POST /admin/partners/{id}/reactivate`
`GET /admin/orders`
`GET /admin/dispatch/queue`
`POST /admin/dispatch/orders/{orderId}/retry`
`GET /admin/audit`

## Segurança

Todas as rotas administrativas devem ser autorizadas pelo backend. Ocultar uma opção no frontend não é controlo de acesso. O servidor deve validar `ADMIN`, estados da conta e permissões de cada recurso.
