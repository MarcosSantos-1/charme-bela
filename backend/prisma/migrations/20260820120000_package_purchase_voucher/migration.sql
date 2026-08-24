-- Voucher aplicado na compra do pacote (pagamento global)

ALTER TABLE "PackagePurchase" ADD COLUMN "voucherId" TEXT;
ALTER TABLE "PackagePurchase" ADD COLUMN "voucherAmountApplied" DOUBLE PRECISION;

CREATE INDEX "PackagePurchase_voucherId_idx" ON "PackagePurchase"("voucherId");

ALTER TABLE "PackagePurchase"
  ADD CONSTRAINT "PackagePurchase_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
