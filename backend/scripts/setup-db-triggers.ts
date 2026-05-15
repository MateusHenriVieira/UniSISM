/**
 * Aplica triggers de imutabilidade de audit no banco.
 *
 * Uso:
 *   npm run db:setup-triggers
 *
 * Pode ser chamado em pipelines de deploy (após `prisma migrate deploy`)
 * para garantir que toda promoção de schema tem os triggers ativos.
 *
 * É idempotente — pode rodar quantas vezes quiser sem efeitos colaterais.
 */
import { aplicarTriggersImutabilidade, checarTriggersAtivos } from '../src/main/bootstrapTriggers';
import { prisma } from '../src/infrastructure/database/prisma';

async function main() {
  console.log('→ aplicando triggers de imutabilidade...');
  const r = await aplicarTriggersImutabilidade();
  if (!r.aplicados) {
    console.error(`✗ FALHA: ${r.motivo}`);
    process.exit(1);
  }

  const check = await checarTriggersAtivos();
  console.log('  tfd_audit_log triggers ativos:        ', check.tfdAuditOk ? 'SIM' : 'NÃO');
  console.log('  paciente_prontuario_audit triggers:   ', check.prontuarioAuditOk ? 'SIM' : 'NÃO');

  if (!check.tfdAuditOk || !check.prontuarioAuditOk) {
    console.error('✗ algum trigger não está ativo após apply — verifique permissões do usuário do banco');
    process.exit(2);
  }
  console.log('✓ todos os triggers de imutabilidade aplicados');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
