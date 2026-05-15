-- ============================================================
-- Triggers de imutabilidade para tfd_audit_log
-- ============================================================
-- Garante que NENHUM registro pode ser alterado ou deletado uma vez gravado.
-- Required pra prestação de contas TJ/TCM (LGPD + LRF + Res. CFM).
--
-- Idempotente: pode ser re-executado N vezes sem erro.
-- Aplica também a `paciente_prontuario_audit` (Res. CFM 1.821/2007).
--
-- Aplicar em produção via:
--   npm run db:setup-triggers
-- ou (idempotente) automaticamente no boot do servidor (`bootstrapTriggers.ts`).
-- ============================================================

-- Função compartilhada — qualquer trigger que apontar pra ela rejeita a operação.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit log é imutável (LGPD/CFM/TJ): %.% não pode ser %',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

-- ----- tfd_audit_log -----
DROP TRIGGER IF EXISTS tfd_audit_no_update ON tfd_audit_log;
CREATE TRIGGER tfd_audit_no_update
  BEFORE UPDATE ON tfd_audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

DROP TRIGGER IF EXISTS tfd_audit_no_delete ON tfd_audit_log;
CREATE TRIGGER tfd_audit_no_delete
  BEFORE DELETE ON tfd_audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

DROP TRIGGER IF EXISTS tfd_audit_no_truncate ON tfd_audit_log;
CREATE TRIGGER tfd_audit_no_truncate
  BEFORE TRUNCATE ON tfd_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_immutable();

-- ----- paciente_prontuario_audit (Res. CFM 1.821/2007) -----
DROP TRIGGER IF EXISTS prontuario_audit_no_update ON paciente_prontuario_audit;
CREATE TRIGGER prontuario_audit_no_update
  BEFORE UPDATE ON paciente_prontuario_audit
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

DROP TRIGGER IF EXISTS prontuario_audit_no_delete ON paciente_prontuario_audit;
CREATE TRIGGER prontuario_audit_no_delete
  BEFORE DELETE ON paciente_prontuario_audit
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

DROP TRIGGER IF EXISTS prontuario_audit_no_truncate ON paciente_prontuario_audit;
CREATE TRIGGER prontuario_audit_no_truncate
  BEFORE TRUNCATE ON paciente_prontuario_audit
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_immutable();

-- ============================================================
-- Como remover (apenas DEV/manutenção autorizada — NUNCA em prod):
--   DROP TRIGGER tfd_audit_no_update ON tfd_audit_log;
--   DROP TRIGGER tfd_audit_no_delete ON tfd_audit_log;
--   ...
--   DROP FUNCTION audit_log_immutable;
-- ============================================================
