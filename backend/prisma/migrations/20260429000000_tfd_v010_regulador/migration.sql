-- ======================================================================
-- TFD v0.10 — Modo simplificado (REGULADOR_TFD)
--
-- 1. Adiciona role REGULADOR_TFD ao enum RoleAtendente.
-- 2. Torna ubsId nullable em tfd_solicitacoes (regulador presencial pode
--    não estar vinculado a uma UBS específica).
-- 3. Adiciona acompanhante (JSON), criadaPorId, criadaPorNome.
-- ======================================================================

-- AlterEnum
ALTER TYPE "RoleAtendente" ADD VALUE 'REGULADOR_TFD';

-- DropForeignKey (preciso recriar com ON DELETE SET NULL pra ubsId opcional)
ALTER TABLE "tfd_solicitacoes" DROP CONSTRAINT IF EXISTS "tfd_solicitacoes_ubsId_fkey";

-- AlterTable
ALTER TABLE "tfd_solicitacoes"
  ALTER COLUMN "ubsId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "acompanhante" JSONB,
  ADD COLUMN IF NOT EXISTS "criadaPorId" TEXT,
  ADD COLUMN IF NOT EXISTS "criadaPorNome" TEXT;

-- AddForeignKey
ALTER TABLE "tfd_solicitacoes"
  ADD CONSTRAINT "tfd_solicitacoes_ubsId_fkey"
  FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
