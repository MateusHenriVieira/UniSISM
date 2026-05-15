/**
 * Seed MÍNIMO — banco virgem com 1 único usuário DESENVOLVEDOR.
 *
 *  Usuário:
 *    - Nome:   MATEUS VIEIRA
 *    - Email:  mateushenrivieira@gmail.com
 *    - Senha:  Aguasbelas#!
 *    - Role:   DESENVOLVEDOR (acesso global)
 *    - Escopo: sem vínculo com prefeitura/UBS (DESENVOLVEDOR é global)
 *
 *  Nenhuma prefeitura, UBS, paciente, encaminhamento, notificação ou relatório
 *  é criado. O DEV cadastra tudo via API a partir daqui.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash('Aguasbelas#!', 10);

  const dev = await prisma.atendente.upsert({
    where: { email: 'mateushenrivieira@gmail.com' },
    update: {},
    create: {
      matricula: 'DEV-MATEUS',
      nome: 'MATEUS VIEIRA',
      email: 'mateushenrivieira@gmail.com',
      cpf: '000.000.000-00',
      senhaHash,
      cargo: 'Desenvolvedor',
      funcao: 'Engenharia de Software · UNISISM',
      role: 'DESENVOLVEDOR',
      ativo: true,
      ubsId: null,
      prefeituraId: null,
    },
  });

  console.log('');
  console.log('✓ Banco virgem. Único usuário criado:');
  console.log('');
  console.log(`  id:        ${dev.id}`);
  console.log(`  nome:      ${dev.nome}`);
  console.log(`  matricula: ${dev.matricula}`);
  console.log(`  email:     ${dev.email}`);
  console.log(`  role:      ${dev.role}`);
  console.log(`  escopo:    GLOBAL (sem UBS / sem prefeitura)`);
  console.log('');
  console.log('  Login:   DEV-MATEUS  OU  mateushenrivieira@gmail.com');
  console.log('  Senha:   Aguasbelas#!');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
