-- Reconciliação entre schema.prisma e a base de dados:
-- estas colunas/tabela existiam no código mas nunca foram migradas, pelo que
-- a criação e a listagem de pedidos terminavam em erro (500).

-- Criar enum usado pelas chamadas no chat do pedido.
DO $$ BEGIN
  CREATE TYPE "CallStatus" AS ENUM ('OFFERING', 'RINGING', 'CONNECTED', 'ENDED', 'REJECTED', 'MISSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Colunas do tipo de atendimento (troca / compra nova / recarga) e detalhes de entrega.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "bottleBrand" TEXT DEFAULT 'Sonangol';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "bottleExchangeType" TEXT DEFAULT 'REFILL_EXCHANGE';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "changeForAmount" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryNotes" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "valveType" TEXT DEFAULT 'QUICK_20MM';

-- Sessões de chamada (voz) dentro do chat do pedido.
CREATE TABLE IF NOT EXISTS "CallSession" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "callerId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'OFFERING',
    "sdpOffer" TEXT,
    "sdpAnswer" TEXT,
    "iceCandidates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CallSession_orderId_status_idx" ON "CallSession"("orderId", "status");
CREATE INDEX IF NOT EXISTS "CallSession_callerId_createdAt_idx" ON "CallSession"("callerId", "createdAt");
CREATE INDEX IF NOT EXISTS "CallSession_receiverId_createdAt_idx" ON "CallSession"("receiverId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
