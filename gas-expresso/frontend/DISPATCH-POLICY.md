# Política de despacho — Gás Expresso

O objetivo é entregar bons pedidos com consistência, sem criar um sistema em que apenas quem mantém muito saldo monopoliza a operação.

## Prioridade

A pontuação deve ser calculada no backend. Uma forma saudável de organizar os fatores é:

- **Saldo operacional:** aumenta a prioridade comercial e define banda operacional.
- **Proximidade:** reduz tempo de recolha e custo operacional.
- **Confiabilidade:** considera aceitação, cumprimento e conclusão sem incidentes evitáveis.
- **Qualidade:** avaliação, reclamações e histórico.
- **Capacidade:** veículo, carga e requisitos da entrega.
- **Continuidade:** pequena preferência para manter o mesmo entregador de um cliente quando isso melhora a experiência e o entregador continua elegível.

O peso exato deve ser configurável no servidor, versionado e auditado.

## Regras que não podem ser quebradas

1. Um entregador sem saldo mínimo confirmado não entra em operação.
2. Saldo não torna um entregador inelegível elegível.
3. Segurança e requisitos do veículo têm precedência sobre qualquer pontuação comercial.
4. O mesmo entregador pode ser recomendado novamente, mas a plataforma deve permitir fallback quando ele estiver ocupado, distante, offline ou fora dos requisitos.
5. Alterações de saldo e de prioridade precisam de auditoria.
6. O frontend não calcula nem confirma a decisão final do algoritmo.
