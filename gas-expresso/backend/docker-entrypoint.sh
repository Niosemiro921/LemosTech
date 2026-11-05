#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "A aplicar migrações Prisma..."
  npx prisma migrate deploy
fi

exec node dist/main.js
