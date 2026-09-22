# Gás Expresso — Arquitetura

## Frontend
React + TypeScript + Vite, organizado por domínio/feature.

## Backend
NestJS modular monolith com domínio, aplicação, infraestrutura e apresentação por módulo.

## Regra financeira
Cada transação registra explicitamente `grossAmount`, `supplierAmount`, `driverAmount` e `platformAmount`.
