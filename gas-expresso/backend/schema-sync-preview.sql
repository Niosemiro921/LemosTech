-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ChatThread" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupplierCustomerInteraction" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupplierInvoice" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupplierProductionLot" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WalletWithdrawal" ALTER COLUMN "id" DROP DEFAULT;
