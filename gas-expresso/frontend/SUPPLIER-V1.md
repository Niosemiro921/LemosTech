# Gás Expresso — Frontend Supplier V1

Rota: `/supplier`

Fluxo:

1. Ver pedidos novos
2. Aceitar pedido
3. Preparar botija
4. Marcar pronto para recolha
5. Confirmar recolha
6. Gerir stock por capacidade

Pedidos, inventário e localização são carregados e atualizados através das rotas autenticadas do backend em `/suppliers/me`. Quando um pedido fica pronto, o painel inicia o dispatch; se o dispatch falhar, permite tentar novamente.
