# Acessos dos perfis

Rotas principais:

- `/acesso` — seletor principal de perfis
- `/perfil` — cliente
- `/driver` — entregador
- `/supplier` — fornecedor
- `/driver/pedido/:orderId` — operação de pedido do entregador
- `/supplier/pedido/:orderId` — operação de pedido do fornecedor

As páginas privadas exigem autenticação e role. Fornecedores e entregadores também precisam de aprovação administrativa antes de operar.
