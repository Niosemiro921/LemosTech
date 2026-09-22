# Gás Expresso — Backend Security Fix V2

Esta versão corrige o ciclo de inicialização do JWT/Guards e o problema de emissão do `dist`.

## Principais correções

- `JwtAuthGuard` não depende mais de `@nestjs/passport`; valida o Bearer token diretamente com `JwtService`.
- `SecurityModule` centraliza `JwtModule` + `JwtAuthGuard`.
- `AuthModule` importa/exporta `SecurityModule` e fornece `JwtService` ao `AuthService`.
- `UsersModule` importa `SecurityModule`, evitando `UnknownDependenciesException` ao usar `JwtAuthGuard` em `UsersController`.
- `tsconfig.json` não usa `incremental`, permitindo emissão normal para `dist` com TypeScript 6.
- TypeScript foi fixado em `6.0.3`; Prisma Client/CLI em `6.19.3`; Nest CLI/Schematics em `12.0.3`.

## Teste

```powershell
npm install
npx prisma generate
npm run build
npm run start:dev
```

O arquivo esperado após build é `dist/main.js`.
