# Gás Expresso — Frontend 3.0.0

Frontend React + TypeScript + Vite para a operação de entrega de gás.

## Perfis

- Cliente — pedidos, pagamento, rastreamento e conta.
- Entregador — operação móvel, localização, ofertas, carteira, ganhos acumulados, documentos e incidentes.
- Fornecedor/Empresa — portal independente ERP + CRM.
- Admin — backoffice de operação.

## Instalação

```bash
npm ci
npm run typecheck
npm run dev
```

API local:

```text
http://localhost:5048/api/v1
```

## Navegação principal

### Cliente
`/perfil` · `/pedir` · `/rastrear` · `/enderecos`

### Entregador
`/driver` · `/driver/pedidos` · `/driver/saldo` · `/driver/ganhos` · `/driver/perfil` · `/driver/documentos` · `/driver/incidentes`

### Empresa
`/fornecedor` · `/fornecedor/stock` · `/fornecedor/pedidos` · `/fornecedor/lotes` · `/fornecedor/financeiro` · `/fornecedor/clientes` · `/fornecedor/interacoes` · `/fornecedor/segmentacao` · `/fornecedor/relatorios`

### Admin
`/admin` · `/admin/partners` · `/admin/orders` · `/admin/dispatch` · `/admin/audit` · `/admin/wallet/top-ups`

## Regra de integração

Nenhum dado operacional é fabricado no frontend. O servidor é a fonte de verdade para preço, stock, pedidos, saldo, prioridade, permissões e localização.

Quando um módulo solicitado não tem endpoint identificável no contrato disponível no frontend, a interface informa a integração pendente e não cria dados de demonstração.

Ver `IMPLEMENTATION-SUMMARY.md` e `BACKEND-CONTRACT-PENDENCIES.md`.
