# Gás Expresso — checklist de produção

## Implementado no frontend
- [x] Áreas separadas: Cliente, Entregador e Empresa.
- [x] Cadastro profissional com estado controlado pelo servidor.
- [x] Confirmação de palavra-passe e validação de força.
- [x] Consentimento de termos/política antes do cadastro.
- [x] Telefone com formato angolano recomendado (+244).
- [x] API por defeito em `http://localhost:5048/api/v1`.
- [x] 401 em login não destrói uma sessão inexistente nem redireciona em loop.
- [x] Timeout cancela a requisição HTTP via AbortController.
- [x] Preço, stock, cobertura e dispatch não são simulados no cliente.
- [x] Estado da candidatura é atualizado novamente a partir de `/auth/me`.
- [x] Rota `/empresa` criada; `/supplier` permanece como compatibilidade.
- [x] Histórico/tracking utiliza dados do pedido real.

## Contratos de backend que precisam existir antes do lançamento
- [ ] `/auth/register/customer`
- [ ] `/auth/register/driver`
- [ ] `/auth/register/supplier`
- [ ] `/auth/login`
- [ ] `/auth/me`
- [ ] `/products`
- [ ] `/quotes`
- [ ] criação idempotente de pedido
- [ ] operações de empresa/stock
- [ ] ofertas e estados do entregador
- [ ] tracking e histórico de estados
- [ ] dispatch transacional
- [ ] pagamento digital real, se ativado

## Regra de ouro
Nunca adicionar no frontend valores fictícios de preço, stock, cobertura, entregador, ETA ou pagamento para fazer uma tela parecer funcional. Se a API não fornecer o dado, a interface deve mostrar indisponibilidade ou pedir para tentar novamente.
