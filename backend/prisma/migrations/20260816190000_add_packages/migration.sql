-- CreateEnum
CREATE TYPE "PackagePurchaseStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "packageSessionCount" INTEGER,
ADD COLUMN     "installmentsAllowed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "packagePurchaseId" TEXT,
ADD COLUMN     "packageSessionIndex" INTEGER;

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "packageServiceId" TEXT NOT NULL,
    "includedServiceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageServiceId" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "sessionsScheduled" INTEGER NOT NULL DEFAULT 0,
    "pricePaid" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "PackagePurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "itemsSnapshot" JSONB NOT NULL,
    "installmentsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "paymentExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageItem_packageServiceId_includedServiceId_key" ON "PackageItem"("packageServiceId", "includedServiceId");

-- CreateIndex
CREATE INDEX "PackageItem_packageServiceId_idx" ON "PackageItem"("packageServiceId");

-- CreateIndex
CREATE INDEX "PackagePurchase_userId_status_idx" ON "PackagePurchase"("userId", "status");

-- CreateIndex
CREATE INDEX "PackagePurchase_packageServiceId_idx" ON "PackagePurchase"("packageServiceId");

-- CreateIndex
CREATE INDEX "PackagePurchase_paymentExpiresAt_idx" ON "PackagePurchase"("paymentExpiresAt");

-- CreateIndex
CREATE INDEX "Appointment_packagePurchaseId_idx" ON "Appointment"("packagePurchaseId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_packagePurchaseId_fkey" FOREIGN KEY ("packagePurchaseId") REFERENCES "PackagePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageServiceId_fkey" FOREIGN KEY ("packageServiceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_includedServiceId_fkey" FOREIGN KEY ("includedServiceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePurchase" ADD CONSTRAINT "PackagePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePurchase" ADD CONSTRAINT "PackagePurchase_packageServiceId_fkey" FOREIGN KEY ("packageServiceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
