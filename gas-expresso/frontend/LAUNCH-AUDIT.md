# Auditoria de lançamento — Gás Expresso

Esta versão removeu simulações que poderiam ser confundidas com operação real e reforçou os fluxos de Cliente, Entregador e Empresa.

## Alterações visíveis
1. A área de acesso passou a tratar a rede profissional como **Empresa**, não apenas fornecedor.
2. Cadastro de empresa e entregador ganhou fluxo de candidatura explícito.
3. Palavra-passe tem confirmação, força mínima e consentimento.
4. Estado profissional é consultado novamente no servidor.
5. Rotas `/empresa` e `/empresa/pedido/:orderId` existem sem remover as antigas rotas de compatibilidade.
6. API default usa a porta 5048 do backend .NET usado pelo projeto.
7. Preço, cobertura, stock, dispatch e pagamento não são fabricados no browser.

## Ponto de integração obrigatório
O backend continua sendo a autoridade para identidade, permissões, preço, stock, disponibilidade, despacho, tracking e pagamento. O frontend não consegue criar documentos legais, licenças, aprovações ou integrações de pagamento sem endpoints correspondentes.
