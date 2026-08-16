-- AlterTable
ALTER TABLE "User" ADD COLUMN "asaasCustomerId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "asaasSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "asaasPaymentId" TEXT;

-- AlterTable
ALTER TABLE "PackagePurchase" ADD COLUMN "asaasPaymentId" TEXT;

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'asaas',
    "event" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_asaasCustomerId_key" ON "User"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_asaasSubscriptionId_key" ON "Subscription"("asaasSubscriptionId");

-- CreateIndex
CREATE INDEX "Appointment_asaasPaymentId_idx" ON "Appointment"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "PackagePurchase_asaasPaymentId_idx" ON "PackagePurchase"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_source_createdAt_idx" ON "ProcessedWebhookEvent"("source", "createdAt");
