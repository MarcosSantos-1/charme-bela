-- Cancelamento separado de reembolso/crédito + saldo reutilizável no voucher

CREATE TYPE "SettlementChoice" AS ENUM ('REFUND', 'CREDIT');
CREATE TYPE "RefundStatus" AS ENUM ('NOT_APPLICABLE', 'PROCESSING', 'DONE', 'MANUAL_REQUIRED');

ALTER TABLE "Appointment" ADD COLUMN "settlementChoice" "SettlementChoice";
ALTER TABLE "Appointment" ADD COLUMN "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_APPLICABLE';
ALTER TABLE "Appointment" ADD COLUMN "refundError" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "voucherAmountApplied" DOUBLE PRECISION;

CREATE INDEX "Appointment_refundStatus_idx" ON "Appointment"("refundStatus");

ALTER TABLE "Voucher" ADD COLUMN "remainingAmount" DOUBLE PRECISION;

-- Créditos em R$ ainda ativos passam a ter saldo restante
UPDATE "Voucher"
SET "remainingAmount" = "discountAmount"
WHERE "type" = 'DISCOUNT'
  AND "discountAmount" IS NOT NULL
  AND ("discountPercent" IS NULL OR "discountPercent" = 0)
  AND "isUsed" = false;

UPDATE "Voucher"
SET "remainingAmount" = 0
WHERE "type" = 'DISCOUNT'
  AND "discountAmount" IS NOT NULL
  AND ("discountPercent" IS NULL OR "discountPercent" = 0)
  AND "isUsed" = true;
