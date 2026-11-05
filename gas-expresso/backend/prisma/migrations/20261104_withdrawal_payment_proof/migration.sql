-- Comprovativo do pagamento manual (transferência IBAN / Multicaixa Express / Redotpay)
ALTER TABLE "WalletWithdrawal" ADD COLUMN "paymentReference" TEXT;
ALTER TABLE "WalletWithdrawal" ADD COLUMN "paymentProofUrl" TEXT;
