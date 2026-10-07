# Gás Expresso Frontend 2.0

Esta versão concentra o frontend em operação real e remove dependência de telas decorativas.

## Entregador
- saldo operacional e recarga via API
- bloqueio de operação quando o saldo mínimo não for confirmado
- prioridade devolvida pelo servidor
- ganhos
- documentos
- incidentes
- ferramentas de operação no painel

## Cliente
- endereços guardados
- notificações
- suporte
- rastreamento com atualização em tempo real opcional

## Empresa
- documentos
- equipa
- horários
- continuidade do painel existente de pedidos, stock e localização

## Administração
- dashboard
- gestão de parceiros
- pedidos
- dispatch/recomendação
- auditoria

## Importante
Os novos ecrãs usam endpoints reais definidos em `BACKEND-CONTRACT-V2.md`. Não existe fallback para dados inventados. A parte de algoritmo, saldo, autenticação administrativa e permissões continua a ser responsabilidade do backend .NET.
