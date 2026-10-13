# Gás Expresso — Área da Empresa / Fornecedor

## Objectivo desta entrega

Organizar a área empresarial num portal próprio, com navegação ERP/CRM e estados operacionais claros, utilizando exclusivamente os contratos presentes no backend NestJS/Prisma enviado. O papel actualmente suportado pelo backend é `SUPPLIER`; a interface mostra “Empresa / Fornecedor”.

## Como correr

Requisitos: Node.js `>=22.12.0` e npm `>=10`.

```powershell
npm ci
npm run typecheck
npm run build
npm run dev
```

Configuração local em `.env.local` (criar a partir de `.env.example`):

```dotenv
VITE_API_BASE_URL=http://localhost:5048/api/v1
```

Não inclua `.env.local`, segredos, `node_modules` ou builds no controlo de versões.

## Rotas da área empresarial

- `/fornecedor` — visão geral / dashboard derivado de pedidos, stock e localização reais.
- `/fornecedor/pedidos` — pedidos recebidos, pesquisa, filtro por estado e transição operacional.
- `/fornecedor/pedido/:orderId` — detalhe do pedido, sequência operacional e cancelamento com motivo quando o estado permite.
- `/fornecedor/stock` — inventário, quantidades disponíveis/reservadas, nível mínimo e motivo obrigatório para alteração da quantidade.
- `/fornecedor/localizacao` — mapa Leaflet/OpenStreetMap, selecção de ponto e GPS; grava coordenadas na API.
- `/fornecedor/perfil` — estado de autenticação, localização e explicação dos campos comerciais ainda sem endpoint de leitura/actualização.
- `/empresa/documentos` — lista real de documentos e pedido de nova revisão apenas para documento rejeitado e não expirado.
- `/empresa/equipa` — consulta real dos utilizadores associados; backend actual só devolve o proprietário da empresa.
- `/empresa/horarios` — edição dos sete dias; a chamada PATCH envia somente `dayOfWeek`, `enabled`, `openTime` e `closeTime`.
- `/fornecedor/lotes` — página de integração pendente, sem formulário falso.
- `/fornecedor/financeiro` — visão limitada com base em pedidos reais; não representa facturação/tesouraria contabilística.
- `/fornecedor/clientes`, `/fornecedor/interacoes`, `/fornecedor/segmentacao` — pendentes até o backend expor APIs de CRM.
- `/fornecedor/relatorios` — resumo transparente derivado dos pedidos devolvidos pela API, sem alegar ser relatório contabilístico ou server-side.

Alias `/empresa` e `/supplier` redireccionam utilizadores `SUPPLIER` para `/fornecedor`.

## Contratos de backend reutilizados

### Cadastro

`POST /auth/register/supplier`

Campos confirmados: `legalName`, `tradeName`, `nif`, `responsibleName`, `phone`, `email?`, `password`.
O cadastro não envia registo comercial, actividade ou morada porque o DTO actual não os aceita. A candidatura entra em revisão; o frontend não simula aprovação.

### Pedidos

- `GET /suppliers/me/orders`
- `POST /suppliers/me/orders/:id/accept`
- `POST /suppliers/me/orders/:id/prepare`
- `POST /suppliers/me/orders/:id/ready`
- `POST /suppliers/me/orders/:id/cancel` com `{ note }`
- `POST /dispatch/orders/:orderId/start` com `{ maxOffers }`

O backend valida as transições, regista o histórico e liberta a reserva de stock numa transacção ao cancelar. O frontend executa uma transição por vez e actualiza a lista após a resposta.

### Inventário e localização

- `GET /suppliers/me/inventory`
- `PATCH /suppliers/me/inventory` com `variantId`, `availableQty`, `reorderLevel?`, `note?`
- `GET /suppliers/me/location`
- `PATCH /suppliers/me/location` com `latitude`, `longitude`

A API impede que a quantidade disponível fique inferior à quantidade reservada e regista movimentos de ajuste. O frontend obriga um motivo quando a quantidade é alterada; não simula o livro de movimentos, pois não existe endpoint de leitura desses movimentos.

### Horários, documentos e equipa

- `GET /suppliers/me/schedule`
- `PATCH /suppliers/me/schedule` com sete objectos `{ dayOfWeek, enabled, openTime, closeTime }`
- `GET /suppliers/me/documents`
- `POST /suppliers/me/documents/:id/review` (somente documento `REJECTED` e não expirado)
- `GET /suppliers/me/team`

A API actual não disponibiliza upload/criação de documentos, convite/edição de membros ou permissões por membro.

## Pendências identificadas no backend

Os módulos abaixo aparecem no menu para preservar a arquitectura do portal, mas os respectivos fluxos de gravação/listagem não são fingidos nem chamados enquanto o backend não os implementar:

1. **Perfil comercial:** `GET/PATCH /suppliers/me/profile`. Necessário para ler/editar razão social, nome comercial, NIF, responsável e dados de contacto/localidade; o `SupplierProfile` já guarda parte dos campos, mas não existe endpoint de leitura/actualização dedicado.
2. **Dashboard agregado:** `GET /suppliers/me/dashboard` é desnecessário para o frontend actual — KPIs operacionais são derivados das listas reais existentes. Para grandes volumes, recomenda-se criar endpoint agregado com paginação/indicadores server-side.
3. **Lotes:** `GET/POST /suppliers/me/lots`, `PATCH /suppliers/me/lots/:id`, associação a variante e movimentos de rastreabilidade.
4. **Financeiro/ERP:** endpoints para facturas, recebimentos, despesas, reconciliação e estado de pagamento. A soma de pedidos é apenas um indicador comercial, não uma fonte contabilística.
5. **CRM:** lista de clientes da empresa com política de acesso a dados pessoais, interacções, segmentação e relatórios de retenção/vendas.
6. **Movimentos de stock:** `GET /suppliers/me/inventory/movements` com filtros/paginação para consultar os movimentos que o backend já regista.
7. **Documentos:** endpoint de upload privado e seguro, criação, tipos permitidos, tamanho/tipo MIME, validade, metadados, armazenamento e auditoria.
8. **Equipa:** convite/associação de utilizador, alteração de papel, suspensão/remover acesso e permissões por função.
9. **Cadastro comercial enriquecido:** acrescentar ao DTO de registo ou ao perfil campos de registo comercial, actividade, telefone alternativo, província, município, bairro e morada — e definir fluxo de verificação documental.

Também há uma dívida de produto no backend: o papel `PRESTADOR` não existe actualmente no enum de roles. O frontend não redirecciona um cadastro de empresa para o perfil de prestador, nem envia dados a um endpoint de prestador fictício.

## Ficheiros principais alterados/criados

- `src/pages/AccessPage.tsx` — perfis públicos separados e caminho de Empresa.
- `src/pages/RegisterPage.tsx` — registo por perfil, sem fingir suporte a PRESTADOR.
- `src/pages/register/registerConfig.ts` — aliases normalizados e apenas papéis registáveis confirmados.
- `src/pages/register/SupplierRegisterForm.tsx` — cadastro de empresa alinhado ao DTO real.
- `src/services/auth.ts` — método PRESTADOR falha explicitamente sem chamar URL inexistente.
- `src/components/SupplierShell.tsx` — portal empresarial independente e navegação ERP/CRM.
- `src/pages/SupplierPage.tsx` — dashboard operacional baseado em dados reais.
- `src/pages/SupplierOrdersPage.tsx` e `src/pages/SupplierOrderPage.tsx` — listagem, detalhe, estados e cancelamento com motivo.
- `src/pages/SupplierStockPage.tsx` — gestão de inventário real e validação de reservas.
- `src/pages/SupplierLocationPage.tsx` — mapa real, GPS e persistência de coordenadas.
- `src/pages/SupplierProfilePage.tsx` — informação real da conta e pendências explícitas do perfil comercial.
- `src/pages/CompanyDocumentsPage.tsx` — documentos/revisão em conformidade com as regras do backend.
- `src/pages/CompanyTeamPage.tsx` — directório real somente de leitura.
- `src/pages/CompanySchedulePage.tsx` e `src/services/company.ts` — gestão semanal e payload PATCH compatível com DTO.
- `src/pages/SupplierFinancePage.tsx`, `SupplierReportsPage.tsx` — resumos claramente delimitados; sem facturas falsas.
- `src/pages/SupplierIntegrationPendingPage.tsx` e wrappers `SupplierLotsPage.tsx`, `SupplierCustomersPage.tsx`, `SupplierInteractionsPage.tsx`, `SupplierSegmentationPage.tsx` — especificação visível das integrações por completar.
- `src/services/supplier.ts` — contratos reais de pedidos, stock, localização e cancelamento.
- `src/services/supplierBusiness.ts` — removidas chamadas a APIs não implementadas.
- `src/components/RealMap.tsx` — suporte a centro inicial separado da posição confirmada.
- `src/app/routes.tsx` — rota de localização e aliases do portal.
- `src/app/styles.css` — estilos responsivos dos módulos de empresa.

## Validação feita

- `npm run typecheck`: **passou sem erros** após as alterações.
- `npm run build`: não conseguiu iniciar o Vite neste ambiente devido ao binário opcional de Rolldown específico da plataforma (`@rolldown/binding-linux-x64-gnu`) em falta. O ZIP final exclui `node_modules`; executar `npm ci` no Windows alvo e validar `npm run build` nesse ambiente.

## Critérios de aceitação para a equipa

- Cadastrar fornecedor com a API, receber conta em estado pendente e só operar se aprovado.
- Entrar com papel `SUPPLIER` e ser encaminhado para `/fornecedor`.
- Ver pedidos, stock e localização vindos da API, com estados de erro/carregamento/vazio.
- Alterar horário e confirmar que o PATCH aceita o payload sem o campo visual `label`.
- Recusar/revisar apenas documentos em estado permitido pelo backend.
- Cancelar pedido elegível com motivo e confirmar estado/libertação de stock no backend.
- Confirmar que lotes, facturação e CRM ficam marcados pendentes sem criar nem mostrar registos inventados.
