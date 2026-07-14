-- Update cancellation/reschedule window default from 8h to 4h
ALTER TABLE "SystemConfig" ALTER COLUMN "minCancellationHours" SET DEFAULT 4;
ALTER TABLE "SystemConfig" ALTER COLUMN "minRescheduleHours" SET DEFAULT 4;

-- Apply to existing config rows that still use the previous 8h default
UPDATE "SystemConfig"
SET "minCancellationHours" = 4
WHERE "minCancellationHours" = 8;

UPDATE "SystemConfig"
SET "minRescheduleHours" = 4
WHERE "minRescheduleHours" = 8;
