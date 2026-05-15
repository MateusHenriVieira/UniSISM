-- CreateEnum
CREATE TYPE "FonteRecursoTFD" AS ENUM ('EMPENHO', 'PORTARIA', 'REPASSE_FEDERAL', 'REPASSE_ESTADUAL', 'REMANEJAMENTO', 'OUTRO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AcaoAuditoriaTFD" ADD VALUE 'SALDO_APORTADO';
ALTER TYPE "AcaoAuditoriaTFD" ADD VALUE 'SALDO_AJUDA_AJUSTADO';
ALTER TYPE "AcaoAuditoriaTFD" ADD VALUE 'SALDO_AJUDA_APORTADO';

-- CreateTable
CREATE TABLE "tfd_saldo_frota_aportes" (
    "id" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "veiculoId" TEXT,
    "rateioGeral" BOOLEAN NOT NULL DEFAULT false,
    "grupoRateioId" TEXT,
    "mes" TEXT NOT NULL,
    "valorBRL" DECIMAL(14,2) NOT NULL,
    "fonte" "FonteRecursoTFD" NOT NULL,
    "numeroDocumento" TEXT,
    "descricaoFonte" TEXT,
    "justificativa" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tfd_saldo_frota_aportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_saldo_ajuda_custo" (
    "prefeituraId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "saldoMensal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoConsumido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoReservado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tetoAlimentacao" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tetoHospedagem" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tetoDeslocamento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tfd_saldo_ajuda_custo_pkey" PRIMARY KEY ("prefeituraId","mes")
);

-- CreateTable
CREATE TABLE "tfd_saldo_ajuda_aportes" (
    "id" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valorBRL" DECIMAL(14,2) NOT NULL,
    "fonte" "FonteRecursoTFD" NOT NULL,
    "numeroDocumento" TEXT,
    "descricaoFonte" TEXT,
    "justificativa" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tfd_saldo_ajuda_aportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_saldo_ajuda_ajustes" (
    "id" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "saldoAnterior" DECIMAL(14,2) NOT NULL,
    "saldoNovo" DECIMAL(14,2) NOT NULL,
    "tetoAlimentacaoAnterior" DECIMAL(12,2) NOT NULL,
    "tetoAlimentacaoNovo" DECIMAL(12,2) NOT NULL,
    "tetoHospedagemAnterior" DECIMAL(12,2) NOT NULL,
    "tetoHospedagemNovo" DECIMAL(12,2) NOT NULL,
    "tetoDeslocamentoAnterior" DECIMAL(12,2) NOT NULL,
    "tetoDeslocamentoNovo" DECIMAL(12,2) NOT NULL,
    "justificativa" TEXT NOT NULL,
    "ajustadoPorId" TEXT NOT NULL,
    "ajustadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tfd_saldo_ajuda_ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_idempotency_keys" (
    "hash" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseJson" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tfd_idempotency_keys_pkey" PRIMARY KEY ("hash")
);

-- CreateIndex
CREATE INDEX "tfd_saldo_frota_aportes_prefeituraId_mes_criadoEm_idx" ON "tfd_saldo_frota_aportes"("prefeituraId", "mes", "criadoEm");

-- CreateIndex
CREATE INDEX "tfd_saldo_frota_aportes_veiculoId_mes_idx" ON "tfd_saldo_frota_aportes"("veiculoId", "mes");

-- CreateIndex
CREATE INDEX "tfd_saldo_frota_aportes_grupoRateioId_idx" ON "tfd_saldo_frota_aportes"("grupoRateioId");

-- CreateIndex
CREATE INDEX "tfd_saldo_ajuda_aportes_prefeituraId_mes_criadoEm_idx" ON "tfd_saldo_ajuda_aportes"("prefeituraId", "mes", "criadoEm");

-- CreateIndex
CREATE INDEX "tfd_saldo_ajuda_ajustes_prefeituraId_mes_idx" ON "tfd_saldo_ajuda_ajustes"("prefeituraId", "mes");

-- CreateIndex
CREATE INDEX "tfd_idempotency_keys_operadorId_criadoEm_idx" ON "tfd_idempotency_keys"("operadorId", "criadoEm");

-- CreateIndex
CREATE INDEX "tfd_idempotency_keys_expiraEm_idx" ON "tfd_idempotency_keys"("expiraEm");

-- AddForeignKey
ALTER TABLE "tfd_saldo_frota_aportes" ADD CONSTRAINT "tfd_saldo_frota_aportes_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_saldo_ajuda_custo" ADD CONSTRAINT "tfd_saldo_ajuda_custo_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_saldo_ajuda_aportes" ADD CONSTRAINT "tfd_saldo_ajuda_aportes_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
