-- AlterTable
ALTER TABLE "User" ADD COLUMN "expoPushToken" TEXT;
ALTER TABLE "User" ADD COLUMN "pushAllEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "appointmentRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;
