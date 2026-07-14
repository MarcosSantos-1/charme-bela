-- Slots dinâmicos de 30min + capacidade de atendimentos simultâneos

-- AlterTable: nova coluna de capacidade (default 1 = conflito real)
ALTER TABLE "SystemConfig" ADD COLUMN "maxSimultaneous" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: grade de slots passa a ser de 30 minutos por padrão
ALTER TABLE "SystemConfig" ALTER COLUMN "slotDuration" SET DEFAULT 30;

-- Data: migra configuração existente de 60min para a nova grade de 30min
-- (preserva valores customizados diferentes de 60)
UPDATE "SystemConfig" SET "slotDuration" = 30 WHERE "slotDuration" = 60;
