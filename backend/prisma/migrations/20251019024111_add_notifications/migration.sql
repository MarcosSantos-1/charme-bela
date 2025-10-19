-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_REMINDER', 'APPOINTMENT_COMPLETED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_EXPIRING', 'NEW_CLIENT_REGISTERED', 'NEW_APPOINTMENT_REQUEST', 'CLIENT_CANCELED', 'VOUCHER_RECEIVED', 'VOUCHER_EXPIRING', 'SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_CANCELED', 'PLAN_LIMIT_REACHED', 'SYSTEM_MESSAGE', 'PROMOTION', 'WELCOME');

-- CreateEnum
CREATE TYPE "NotificationIcon" AS ENUM ('BELL', 'CALENDAR', 'CARD', 'SPARKLES', 'ALERT', 'CHECK', 'INFO', 'GIFT', 'STAR', 'USER');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "icon" "NotificationIcon" NOT NULL DEFAULT 'BELL',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
