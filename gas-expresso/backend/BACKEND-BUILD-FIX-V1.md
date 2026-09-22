# Gás Expresso — Build Fix V1

Correções aplicadas após o build com TypeScript 6.0.3:

1. Prisma enum `Role` corrigido para `UserRole` em `prisma-admin-review.repository.ts`.
2. Mapeamento de perfil do Admin Review passou a usar um tipo explícito compatível com `ReviewApplicationRecord['profile']`.
3. `tsconfig.json` recebeu `rootDir: ./src` e `ignoreDeprecations: "6.0"` para TypeScript 6.

O schema Prisma já estava válido e `prisma generate` concluía com sucesso antes destas correções.
