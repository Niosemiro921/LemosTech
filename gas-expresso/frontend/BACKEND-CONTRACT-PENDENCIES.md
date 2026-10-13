# Contratos de backend ainda necessários para fechar os módulos

Este documento não cria contratos fictícios. Ele identifica apenas as capacidades que a interface precisa para cumprir integralmente os requisitos do produto.

| Funcionalidade | Endpoint / contrato esperado pelo frontend | Estado |
|---|---|---|
| Logout server-side | variável `VITE_AUTH_LOGOUT_PATH` | Pendente de identificar no backend |
| Levantamento do entregador | `VITE_DRIVER_WITHDRAWAL_PATH` | Pendente |
| Histórico de levantamentos | endpoint de listagem de levantamentos | Pendente |
| Recargas para Admin | `VITE_ADMIN_WALLET_TOPUPS_PATH` | Pendente |
| Confirmar recarga | `VITE_ADMIN_WALLET_TOPUP_CONFIRM_PATH_TEMPLATE` | Pendente |
| Rejeitar recarga | `VITE_ADMIN_WALLET_TOPUP_REJECT_PATH_TEMPLATE` | Pendente |
| Lotes ERP | `/suppliers/me/lots` | Pendente |
| Financeiro ERP | `/suppliers/me/invoices`, `/payments`, `/expenses` | Pendente |
| Clientes CRM | `/suppliers/me/customers` | Pendente |
| Interações CRM | `/suppliers/me/interactions` | Pendente |
| Segmentação CRM | `/suppliers/me/customers/segments` | Pendente |
| Relatórios CRM | `/suppliers/me/reports/sales`, `/reports/retention` | Pendente |
| Tracking realtime | `VITE_REALTIME_URL` + contrato da mensagem | Pendente de confirmação oficial |

Quando estes contratos forem disponibilizados, os módulos já têm os pontos de entrada para integração sem necessidade de mudar a estrutura de navegação.
