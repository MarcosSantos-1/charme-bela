-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SystemConfig" ALTER COLUMN "priceBronze" SET DEFAULT 200.00,
ALTER COLUMN "priceGold" SET DEFAULT 450.00,
ALTER COLUMN "priceSilver" SET DEFAULT 300.00;

-- CreateIndex
CREATE INDEX "Appointment_paymentExpiresAt_idx" ON "Appointment"("paymentExpiresAt");
