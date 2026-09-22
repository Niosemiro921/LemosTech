# Gás Expresso — Frontend

## V1 — Inventário e disponibilidade

Nesta versão o fluxo de pedido inclui uma camada de disponibilidade de fornecedores/stock.

### O que foi adicionado

- `src/services/inventory.ts`
  - rede de parceiros simulada
  - stock por tamanho de botija
  - verificação de quantidade solicitada
  - seleção do parceiro elegível mais adequado
  - estado `available`, `low` ou `unavailable`
- `OrderPage.tsx`
  - mostra disponibilidade após localização + cobertura
  - identifica parceiro verificado
  - mostra unidades disponíveis
  - bloqueia a confirmação quando não existe stock suficiente

### Fonte atual dos dados

O inventário ainda é **mock de frontend**. Nenhum stock real é consumido ou reservado nesta etapa.

Quando o backend estiver implementado, a função de inventário será substituída por uma chamada à API, mantendo a mesma interface de domínio.

### Próxima integração

`GET /inventory/availability` ou endpoint equivalente deverá receber:

- localização do cliente
- produto
- quantidade
- tipo de entrega

E devolver a disponibilidade oficial, fornecedor elegível, ETA e dados necessários para o cálculo final.
