# Acessos dos perfis

Rotas de teste da V1:

- `/acesso` — seletor principal de perfis
- `/perfil` — cliente
- `/driver` — entregador
- `/supplier` — fornecedor
- `/driver/pedido/:orderId` — operação de pedido do entregador
- `/supplier/pedido/:orderId` — operação de pedido do fornecedor

Na fase de backend, `/driver` e `/supplier` serão protegidas por autenticação + role + status de aprovação.
