# Refatoração da página “Pedir gás” — v3.1.0

## Objectivo

Reduzir a sobrecarga visual e guiar o cliente por um fluxo de pedido claro, mobile-first, sem introduzir dados de produto, disponibilidade, preço ou distância fictícios.

## Alterações implementadas

- Fluxo progressivo em três etapas: **Produto → Entrega → Localização**.
- Indicador de progresso com retorno às etapas concluídas.
- Resumo persistente em desktop com tipo de atendimento, produto, quantidade, modalidade de entrega, morada e cotação real.
- Layout e tipografia específicos da página, estados seleccionados acessíveis, áreas clicáveis maiores e melhor adaptação a ecrãs pequenos.
- Produtos e preços carregados pelo serviço de catálogo existente.
- Removido o sinalizador “Mais pedido” atribuído localmente ao produto de 12 kg; popularidade só deve ser mostrada quando vier explicitamente da API.
- Cotação do servidor limpa enquanto um novo preço está a ser calculado para evitar mostrar a cotação anterior para um endereço novo.
- Erro de cotação com tentativa explícita de cálculo novamente.
- Estados de carregamento, catálogo vazio, erro de catálogo, endereço não definido, erro de localização e indisponibilidade.
- Geolocalização seguida de reverse-geocoding, quando disponível; se falhar, as coordenadas continuam utilizáveis e são apresentadas de forma explícita.
- Mensagem clara quando a permissão de GPS é recusada, com pesquisa e selecção manual do ponto como alternativa.
- Mapa real Leaflet/OpenStreetMap inicia numa vista de referência de Luanda em vez das coordenadas 0,0. Esta vista é apenas a posição inicial do mapa e não é apresentada como localização do cliente.
- O mapa recentra quando o cliente escolhe uma posição por GPS/pesquisa.
- A selecção de entrega programada mantém a data/hora ao navegar entre opções, e a validação impede continuar sem uma hora definida.
- `setAddress` aceita `null` para limpar correctamente um endereço sem criar um objecto vazio que possa bloquear o fluxo.

## Serviços e modelos reutilizados

- `services/catalog.ts` / `fetchGasProducts`
- `services/quote.ts` / `createQuote`
- `services/geocoding.ts` / `searchAddress`, `reverseGeocode`
- `components/RealMap.tsx`
- `stores/orderStore.ts`
- `services/orderKinds.ts`
- `types/gas.ts`

Não foram acrescentados endpoints nem valores de preço/stock/fornecedor artificiais. A criação e confirmação do pedido continuam no fluxo de confirmação existente e o servidor permanece fonte de verdade da cotação.

## Ficheiros alterados

- `src/pages/OrderPage.tsx`
- `src/app/styles.css`
- `src/components/RealMap.tsx`
- `src/services/catalog.ts`
- `src/stores/orderStore.ts`
- `package.json`
- `package-lock.json`

## Validação realizada

- TypeScript: `tsc -b --pretty false` passou sem erros, usando o compilador TypeScript global disponível no ambiente de validação.
- CSS: analisado pelo parser PostCSS, sem erros de sintaxe.
- Formatação de moeda validada em `pt-AO`; exemplo: `50 000 Kz`.
- Não foi possível validar o build Vite neste ambiente porque o ZIP original contém binário nativo Rolldown para Windows, não Linux, e a instalação de dependências da plataforma não terminou por limitação de rede.

## Como validar no Windows

A partir da pasta `frontend`:

```powershell
npm ci
npm run typecheck
npm run build
npm run dev
```

Verificar manualmente:
1. Catálogo com resposta, vazio e erro de API.
2. Os três tipos de atendimento e selecção de cada variante disponível.
3. Quantidade e valor actualizado.
4. Entrega expressa e programada (data obrigatória).
5. GPS permitido, negado e timeout; pesquisa de morada; clique manual no mapa.
6. Cotação disponível, indisponível e erro com tentativa de novo cálculo.
7. Ecrãs de 360 px, 390 px, tablet e desktop.
8. Confirmação recebe o produto, quantidade, modalidade, endereço, coordenadas, troco e instruções correctos.

## Limitação conhecida

A pesquisa e o reverse-geocoding ainda chamam o Nominatim público através de `services/geocoding.ts`. Para um lançamento público, mover estas chamadas para um endpoint/backend proxy ou usar fornecedor contratado com limites, cache e SLA. Os tiles OSM continuam reais e incluem atribuição, mas o serviço público de tiles não deve ser tratado como infraestrutura de produção garantida.
