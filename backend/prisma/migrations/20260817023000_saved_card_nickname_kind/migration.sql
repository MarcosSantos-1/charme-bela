-- AlterTable
ALTER TABLE "SavedCard" ADD COLUMN "nickname" TEXT;
ALTER TABLE "SavedCard" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'credit';
