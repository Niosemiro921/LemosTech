CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Gás Expresso V2: profiles, wallet withdrawals, realtime chat and supplier ERP/CRM.
-- Safe to run on PostgreSQL 14+; all additive changes use IF NOT EXISTS where supported.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PRESTADOR';
ALTER TYPE "AdminReviewAction" ADD VALUE IF NOT EXISTS 'WALLET_TOP_UP_APPROVED';
ALTER TYPE "AdminReviewAction" ADD VALUE IF NOT EXISTS 'WALLET_TOP_UP_REJECTED';
ALTER TYPE "AdminReviewAction" ADD VALUE IF NOT EXISTS 'WALLET_WITHDRAWAL_APPROVED';
ALTER TYPE "AdminReviewAction" ADD VALUE IF NOT EXISTS 'WALLET_WITHDRAWAL_REJECTED';
ALTER TYPE "AdminReviewAction" ADD VALUE IF NOT EXISTS 'WALLET_WITHDRAWAL_PAID';
ALTER TYPE "AdminReviewAction" ADD VALUE IF NOT EXISTS 'EMAIL_SENT';

DO $$ BEGIN CREATE TYPE "WalletWithdrawalStatus" AS ENUM ('PENDING','APPROVED','PAID','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupplierLotStatus" AS ENUM ('IN_PRODUCTION','COMPLETED','DISTRIBUTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupplierInvoiceType" AS ENUM ('SALE','PURCHASE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('PENDING','PAID','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupplierCustomerInteractionType" AS ENUM ('NOTE','CALL','FOLLOW_UP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "DriverProfile"
  ADD COLUMN IF NOT EXISTS "nif" TEXT,
  ADD COLUMN IF NOT EXISTS "driverLicenseNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "driverLicensePhotoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "photoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "vehiclePhotoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleCapacityKg" INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS "experienceYears" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "municipality" TEXT,
  ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "insuranceExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS "DriverProfile_nif_idx" ON "DriverProfile"("nif");
CREATE INDEX IF NOT EXISTS "DriverProfile_vehiclePlate_idx" ON "DriverProfile"("vehiclePlate");
CREATE INDEX IF NOT EXISTS "DriverProfile_isOnline_latitude_longitude_idx" ON "DriverProfile"("isOnline","latitude","longitude");

ALTER TABLE "DriverWallet"
  ADD COLUMN IF NOT EXISTS "reservedBalance" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "minimumOperatingBalance" INTEGER NOT NULL DEFAULT 10000;
CREATE INDEX IF NOT EXISTS "DriverWallet_balance_reservedBalance_idx" ON "DriverWallet"("balance","reservedBalance");

CREATE TABLE IF NOT EXISTS "WalletWithdrawal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "walletId" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "fee" INTEGER NOT NULL DEFAULT 0,
  "cashAmount" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "account" TEXT NOT NULL,
  "status" "WalletWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "reference" TEXT NOT NULL,
  "reviewNote" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "reviewedById" UUID,
  "paidById" UUID,
  CONSTRAINT "WalletWithdrawal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WalletWithdrawal_reference_key" ON "WalletWithdrawal"("reference");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_walletId_requestedAt_idx" ON "WalletWithdrawal"("walletId","requestedAt");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_status_requestedAt_idx" ON "WalletWithdrawal"("status","requestedAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='WalletWithdrawal_walletId_fkey') THEN
    ALTER TABLE "WalletWithdrawal" ADD CONSTRAINT "WalletWithdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DriverWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "SupplierProfile"
  ADD COLUMN IF NOT EXISTS "commercialRegistration" TEXT,
  ADD COLUMN IF NOT EXISTS "activity" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneAlt" TEXT,
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "municipality" TEXT,
  ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "photoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "SupplierProfile_nif_idx" ON "SupplierProfile"("nif");
CREATE INDEX IF NOT EXISTS "SupplierProfile_latitude_longitude_idx" ON "SupplierProfile"("latitude","longitude");

CREATE TABLE IF NOT EXISTS "SupplierProductionLot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "productionAt" TIMESTAMP(3) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "SupplierLotStatus" NOT NULL DEFAULT 'IN_PRODUCTION',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierProductionLot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierProductionLot_supplierId_code_key" ON "SupplierProductionLot"("supplierId","code");
CREATE INDEX IF NOT EXISTS "SupplierProductionLot_supplierId_productionAt_idx" ON "SupplierProductionLot"("supplierId","productionAt");
CREATE INDEX IF NOT EXISTS "SupplierProductionLot_supplierId_status_idx" ON "SupplierProductionLot"("supplierId","status");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierProductionLot_supplierId_fkey') THEN
    ALTER TABLE "SupplierProductionLot" ADD CONSTRAINT "SupplierProductionLot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "SupplierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SupplierInvoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "type" "SupplierInvoiceType" NOT NULL,
  "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "amount" INTEGER NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierInvoice_supplierId_number_key" ON "SupplierInvoice"("supplierId","number");
CREATE INDEX IF NOT EXISTS "SupplierInvoice_supplierId_issueDate_idx" ON "SupplierInvoice"("supplierId","issueDate");
CREATE INDEX IF NOT EXISTS "SupplierInvoice_supplierId_status_idx" ON "SupplierInvoice"("supplierId","status");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierInvoice_supplierId_fkey') THEN
    ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "SupplierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SupplierCustomerInteraction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "type" "SupplierCustomerInteractionType" NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "nextActionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierCustomerInteraction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupplierCustomerInteraction_supplierId_customerId_createdAt_idx" ON "SupplierCustomerInteraction"("supplierId","customerId","createdAt");
CREATE INDEX IF NOT EXISTS "SupplierCustomerInteraction_supplierId_nextActionAt_idx" ON "SupplierCustomerInteraction"("supplierId","nextActionAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierCustomerInteraction_supplierId_fkey') THEN
    ALTER TABLE "SupplierCustomerInteraction" ADD CONSTRAINT "SupplierCustomerInteraction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "SupplierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierCustomerInteraction_customerId_fkey') THEN
    ALTER TABLE "SupplierCustomerInteraction" ADD CONSTRAINT "SupplierCustomerInteraction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ChatThread" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "professionalId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatThread_orderId_key" ON "ChatThread"("orderId");
CREATE INDEX IF NOT EXISTS "ChatThread_customerId_updatedAt_idx" ON "ChatThread"("customerId","updatedAt");
CREATE INDEX IF NOT EXISTS "ChatThread_professionalId_updatedAt_idx" ON "ChatThread"("professionalId","updatedAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ChatThread_orderId_fkey') THEN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ChatThread_customerId_fkey') THEN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ChatThread_professionalId_fkey') THEN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "threadId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId","createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_createdAt_idx" ON "ChatMessage"("senderId","createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ChatMessage_threadId_fkey') THEN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ChatMessage_senderId_fkey') THEN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;



CREATE TABLE IF NOT EXISTS "RevokedToken" (
  "jti" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("jti")
);
CREATE INDEX IF NOT EXISTS "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");
