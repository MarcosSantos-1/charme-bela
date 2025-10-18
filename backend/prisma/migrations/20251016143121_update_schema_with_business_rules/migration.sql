/*
  Warnings:

  - You are about to drop the column `corporalData` on the `AnamnesisForm` table. All the data in the column will be lost.
  - You are about to drop the column `facialData` on the `AnamnesisForm` table. All the data in the column will be lost.
  - The `status` column on the `Appointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Subscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[dayOfWeek]` on the table `ManagerSchedule` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[date]` on the table `ScheduleOverride` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `healthData` to the `AnamnesisForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lifestyleData` to the `AnamnesisForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `objectivesData` to the `AnamnesisForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personalData` to the `AnamnesisForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `origin` on the `Appointment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `ManagerSchedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ScheduleOverride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxTreatmentsPerMonth` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxTreatmentsPerWeek` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tier` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('FACIAL', 'CORPORAL', 'MASSAGEM');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'PAUSED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentOrigin" AS ENUM ('SUBSCRIPTION', 'SINGLE', 'VOUCHER', 'ADMIN_CREATED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('FREE_TREATMENT', 'FREE_MONTH', 'DISCOUNT');

-- DropForeignKey
ALTER TABLE "public"."AnamnesisForm" DROP CONSTRAINT "AnamnesisForm_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- AlterTable
ALTER TABLE "AnamnesisForm" DROP COLUMN "corporalData",
DROP COLUMN "facialData",
ADD COLUMN     "healthData" JSONB NOT NULL,
ADD COLUMN     "lifestyleData" JSONB NOT NULL,
ADD COLUMN     "objectivesData" JSONB NOT NULL,
ADD COLUMN     "personalData" JSONB NOT NULL,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "canceledBy" TEXT,
ADD COLUMN     "confirmedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "voucherId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "origin",
ADD COLUMN     "origin" "AppointmentOrigin" NOT NULL;

-- AlterTable
ALTER TABLE "ManagerSchedule" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleOverride" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "category" "ServiceCategory" NOT NULL DEFAULT 'CORPORAL',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "minimumCommitmentEnd" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "stripeSubscriptionId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxFacialPerMonth" INTEGER,
ADD COLUMN     "maxTreatmentsPerMonth" INTEGER NOT NULL,
ADD COLUMN     "maxTreatmentsPerWeek" INTEGER NOT NULL,
ADD COLUMN     "tier" "PlanTier" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "stripePriceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "firebaseUid" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MonthlyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalTreatments" INTEGER NOT NULL DEFAULT 0,
    "facialTreatments" INTEGER NOT NULL DEFAULT 0,
    "weeklyUsage" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL,
    "description" TEXT NOT NULL,
    "serviceId" TEXT,
    "anyService" BOOLEAN NOT NULL DEFAULT false,
    "discountPercent" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "planId" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "grantedBy" TEXT NOT NULL,
    "grantedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "minCancellationHours" INTEGER NOT NULL DEFAULT 8,
    "minRescheduleHours" INTEGER NOT NULL DEFAULT 8,
    "defaultStartTime" TEXT NOT NULL DEFAULT '09:00',
    "defaultEndTime" TEXT NOT NULL DEFAULT '18:00',
    "slotDuration" INTEGER NOT NULL DEFAULT 60,
    "minimumCommitmentMonths" INTEGER NOT NULL DEFAULT 3,
    "enableEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enableSmsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyUsage_userId_year_month_idx" ON "MonthlyUsage"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyUsage_userId_month_year_key" ON "MonthlyUsage"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "Voucher_userId_idx" ON "Voucher"("userId");

-- CreateIndex
CREATE INDEX "Voucher_isUsed_idx" ON "Voucher"("isUsed");

-- CreateIndex
CREATE INDEX "AnamnesisForm_userId_idx" ON "AnamnesisForm"("userId");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerSchedule_dayOfWeek_key" ON "ManagerSchedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "ScheduleOverride_date_idx" ON "ScheduleOverride"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleOverride_date_key" ON "ScheduleOverride"("date");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_tier_idx" ON "SubscriptionPlan"("tier");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyUsage" ADD CONSTRAINT "MonthlyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisForm" ADD CONSTRAINT "AnamnesisForm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
