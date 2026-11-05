const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const phone = '999000111';
  const passwordHash = bcrypt.hashSync('Demo@123', 12);
  const user = await prisma.user.upsert({
    where: { phone_role: { phone, role: 'SUPPLIER' } },
    update: { passwordHash, status: 'ACTIVE' },
    create: { phone, role: 'SUPPLIER', passwordHash, status: 'ACTIVE', email: 'qa.supplier@lemostech.test', name: 'QA Empresa' },
  });
  await prisma.supplierProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, legalName: 'QA Empresa de Gás', tradeName: 'QA Gás', nif: '999999999', responsibleName: 'QA Responsável' },
  });
  console.log('QA supplier ready', user.id);
}
main().finally(() => prisma.$disconnect());
