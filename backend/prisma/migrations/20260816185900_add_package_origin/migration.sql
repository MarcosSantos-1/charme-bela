-- AlterEnum
-- IF NOT EXISTS: um deploy anterior pode ter gravado o valor e rollbackado o _prisma_migrations.
ALTER TYPE "AppointmentOrigin" ADD VALUE IF NOT EXISTS 'PACKAGE';
