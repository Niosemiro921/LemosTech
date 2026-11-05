# Importação de dados (Excel/CSV)

O sistema aceita a migração de dados a partir de uma folha de cálculo guardada em **CSV UTF-8**. O mesmo importador está disponível para o fornecedor (`/fornecedor/importar`) e para o administrador (`/admin/importar`).

## Entidades suportadas

| Entidade | O que importa | Chave de idempotência |
| --- | --- | --- |
| `products` | Produto, variante, preços e stock inicial do fornecedor | `sku` (variante) e `productSlug` (produto) |
| `customers` | Contas de cliente, perfil e endereço principal | `phone` (por perfil CUSTOMER) |
| `invoices` | Faturas de venda e compra do fornecedor | `supplierId + number` |

## Fluxo na interface

1. **Descarregar modelo CSV** na página de importação.
2. Preencher no Excel e guardar como **CSV UTF-8**.
3. **Validar e pré-visualizar** — nada é gravado.
4. Corrigir erros e repetir a pré-visualização, se necessário.
5. **Confirmar importação** — grava apenas as linhas válidas e devolve um relatório.

Reimportar o mesmo ficheiro é seguro: linhas já existentes são ignoradas (ou atualizadas, no caso de produtos) sem duplicar registos.

## Formatos dos modelos

### Produtos

```csv
productSlug;productName;productDescription;sku;variantName;weightKg;unitPrice;cylinderPrice;stockQty;reorderLevel
gas-expresso;Gás Expresso;Catálogo da empresa;GAS-12KG;Botija 12kg;12;15000;0;100;5
```

- `variantName`/`productName`, `weightKg` e `unitPrice` são obrigatórios; os restantes campos são opcionais.
- O `sku` é opcional: se faltar, é gerado automaticamente a partir do produto e do peso (ex.: `AUTO-BOTIJA-12KG-12KG`).
- `productSlug` agrupa variantes no mesmo produto. Se ficar vazio, é gerado a partir do nome.
- `stockQty` só é aplicado quando o administrador escolhe uma empresa fornecedora. Para o fornecedor autenticado, o stock é sempre aplicado à própria empresa.
- Ao reimportar, o stock existente é substituído pelo valor do ficheiro (nunca fica abaixo do stock reservado).

### Clientes

```csv
fullName;phone;email;address;reference;municipality;province;latitude;longitude
João Manuel;923000000;joao@exemplo.ao;Rua 1, Casa 2;Ao lado da farmácia;Luanda;Luanda;;
```

- `fullName` e `phone` são obrigatórios.
- O telefone é normalizado para `+244XXXXXXXXX`.
- A conta é criada com uma palavra-passe aleatória descartada; o cliente deve usar “recuperar acesso”/apoio para definir a palavra-passe.
- Telefones já registados são ignorados; emails já usados por outra conta geram erro na linha.

### Faturas

```csv
number;type;status;amount;issueDate;dueDate;description
FT-2025-001;SALE;PENDING;150000;15/01/2025;15/02/2025;Venda de botijas
```

- `type`: `SALE`/`VENDA` ou `PURCHASE`/`COMPRA`.
- `status`: `PENDING`, `PAID` ou `CANCELLED` (por omissão `PENDING`).
- Datas em `AAAA-MM-DD` ou `DD/MM/AAAA`.
- Valores em kwanzas, sem símbolo. `150.000` e `150000` são equivalentes.
- O administrador tem de escolher a empresa fornecedora antes de importar faturas.

## Regras de normalização

- Cabeçalhos são comparados sem acentos/maiúsculas; aceitam-se aliases em português (`nome`, `produto`, `peso`, `preço`, `quantidade`, `telefone`, `valor`, `data`, `tipo`, `estado`, …).
- A pré-visualização mostra os **cabeçalhos detetados** e assinala os obrigatórios que faltam. Se nenhuma linha for válida, confirme se escolheu o tipo de dados correto.
- O separador `;` ou `,` é detetado automaticamente.
- Ficheiros até **5 MB** e **5.000 linhas**.
- Codificação UTF-8; se o ficheiro vier em Latin-1, é convertido automaticamente.
- A primeira linha é sempre o cabeçalho.

## API

Todas as rotas exigem `Authorization: Bearer <token>` com perfil `ADMIN` ou `SUPPLIER`.

```http
GET  /api/v1/imports/templates/:entity        -> { entity, filename, content }
POST /api/v1/imports/preview                  (multipart: file, entity, supplierUserId?)
POST /api/v1/imports/commit                   (multipart: file, entity, supplierUserId?)
```

`supplierUserId` só é usado pelo administrador. Para o fornecedor autenticado, a empresa é resolvida pelo token.

Exemplo:

```bash
curl -X POST http://localhost:5048/api/v1/imports/preview \
  -H "Authorization: Bearer $TOKEN" \
  -F "entity=products" \
  -F "file=@produtos.csv"
```

Resposta de pré-visualização:

```json
{
  "entity": "products",
  "total": 2,
  "valid": 1,
  "invalid": 1,
  "skipped": 0,
  "rows": [
    { "line": 2, "action": "create", "valid": true, "errors": [], "message": "Produto e variante serão criados." },
    { "line": 3, "action": "create", "valid": false, "errors": ["Preço unitário inválido."] }
  ],
  "warnings": []
}
```

Resposta de importação:

```json
{
  "entity": "products",
  "total": 2,
  "created": 1,
  "updated": 0,
  "skipped": 0,
  "failed": 1,
  "errors": [{ "line": 3, "message": "Preço unitário inválido." }]
}
```

## Segurança

- Sem escrita direta de SQL: tudo passa pelo Prisma.
- Limite de tamanho e de linhas, validação de extensão `.csv`.
- O fornecedor só consegue importar stock/faturas para a própria empresa.
- Cada linha é gravada numa transação própria; uma falha não desfaz os registos já importados e aparece no relatório.
- As palavras-passe dos clientes importados são aleatórias e nunca aparecem em logs.

## Limitações atuais

- Ficheiros do Excel nativo (`.xlsx`) não são aceites diretamente; guarde como CSV UTF-8.
- Documentos em PDF/fotos não viajam dentro do CSV. O CSV importa o **registo documental** (faturas/valores/datas); os ficheiros devem ser anexados no perfil da empresa ou importados numa fase seguinte com um pacote ZIP + manifesto.
- Encomendas históricas não são importadas para não alterar stock, carteiras e comissões. Se forem necessárias apenas para relatório, deve ser criado um importador específico.
