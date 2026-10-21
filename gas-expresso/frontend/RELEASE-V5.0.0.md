# Gás Expresso Frontend — Release UI/UX 5.0.0

## O que foi implementado

- Painel de Administração redesenhado com cartões para total de contas (quando a API fornece a contagem), clientes, entregadores, empresas, prestadores, novos registos nas últimas 24 horas, pedidos activos e cliques de clientes nas últimas 24 horas.
- Actualização automática do `GET /admin/overview` a cada 15 segundos, também ao voltar à janela, indicação da última actualização, carregamento inicial, erro visível e retenção dos últimos dados enquanto a API falha.
- Não inventa números: métricas não devolvidas pela API aparecem como `—`. Cliques/page views só aparecem como contadores activos quando a API devolve `analyticsEnabled: true`.
- Medição da navegação e dos cliques de interface no frontend. Os eventos não incluem valores de formulários, palavras-passe, telefones, endereços nem query strings. A área e o caminho são enviados sem IDs de recursos sempre que reconhecidos.
- Selecção do veículo preferido no fluxo de pedido de gás: Motorizada, Carro ou Cupapata. A escolha é enviada na cotação e na criação do pedido e é apresentada na confirmação.
- Inclusão de Cupapata nas opções de veículo do registo/perfil profissional e apresentação legível do tipo de veículo.
- Ajustes responsivos para os novos cartões, indicadores e selector de veículo.

## Importante: alterações de backend necessárias

O ZIP desta release contém o frontend e as instruções/kit de integração. Para que os cliques sejam contados no servidor e para que a preferência do veículo seja respeitada na atribuição de entregadores, é necessário aplicar a integração de backend incluída no pacote `gas-expresso-uiux-v5-complete-kit.zip` (ou `gas-expresso-backend-uiux-v5-integration-kit.zip`) e executar a migração SQL na base certa. O frontend, sozinho, não consegue gravar métricas globais nem alterar o algoritmo de despacho.

Até a integração ser aplicada, o painel mostra `—` nas métricas de analytics em vez de fabricar contagens. O stock continua a depender do inventário real do fornecedor; veículo disponível não resolve ausência de stock.

## Configuração e utilização local

1. Extraia a pasta `frontend` e execute `npm install` num ambiente compatível com as versões do `package.json`.
2. Copie `.env.example` para `.env` e confirme `VITE_API_BASE_URL=http://localhost:5048/api/v1` se esse for o endereço da sua API local.
3. Depois de aplicar a integração de backend, execute `npm run dev` e teste em `/admin` e `/pedir`.
4. Antes de produção, reveja aviso/política de privacidade e a base legal para análise de utilização; implemente consentimento quando aplicável.

## Validação feita

- Análise sintáctica de 97 ficheiros TS/TSX: sem erros de parsing.
- Verificação TypeScript com `--strictNullChecks` nos ficheiros alterados e nas suas dependências directas: concluída sem erros.
- O comando de build completo (`npm run build`) excedeu o limite de tempo deste ambiente; não foi possível certificar um build completo aqui. Execute-o no ambiente local do projecto antes da publicação.
