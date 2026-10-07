# Contratos de backend ainda necessários para fechar os módulos

Este documento não cria contratos fictícios. Ele identifica apenas as capacidades que a interface precisa para cumprir integralmente os requisitos do produto.

| Funcionalidade | Endpoint / contrato esperado pelo frontend | Estado |
|---|---|---|
| Logout server-side | variável `VITE_AUTH_LOGOUT_PATH` | Não configurado: JWT atual não tem revogação |
| Levantamento do entregador | `VITE_DRIVER_WITHDRAWAL_PATH` | Pendente de provedor e fluxo de liquidação |
| Histórico de levantamentos | endpoint de listagem de levantamentos | Pendente de provedor e fluxo de liquidação |
| Pagamentos digitais | Futuro `POST /payments/intents` | Pendente de provedor; o frontend suporta apenas o fluxo implementado de pagamento na entrega |
| Recargas para Admin | `GET /admin/wallet/top-ups` | Implementado; análise manual |
| Confirmar recarga | `POST /admin/wallet/top-ups/:id/confirm` | Implementado; exige confirmação operacional externa |
| Rejeitar recarga | `POST /admin/wallet/top-ups/:id/reject` | Implementado; motivo obrigatório |
| Lotes ERP | `/suppliers/me/lots` | Pendente |
| Financeiro ERP | `/suppliers/me/invoices`, `/payments`, `/expenses` | Pendente |
| Clientes CRM | `/suppliers/me/customers` | Pendente |
| Interações CRM | `/suppliers/me/interactions` | Pendente |
| Segmentação CRM | `/suppliers/me/customers/segments` | Pendente |
| Relatórios CRM | `/suppliers/me/reports/sales`, `/reports/retention` | Pendente |
| Tracking realtime | `VITE_REALTIME_URL` + contrato da mensagem | Pendente de confirmação oficial |

Quando estes contratos forem disponibilizados, os módulos já têm os pontos de entrada para integração sem necessidade de mudar a estrutura de navegação.
