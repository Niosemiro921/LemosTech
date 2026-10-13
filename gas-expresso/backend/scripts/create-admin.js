/* Cria (ou atualiza) uma conta de administrador.
 *
 * Uso:  node scripts/create-admin.js <telefone> <nome> <palavra-passe> [email]
 * Ex.:  node scripts/create-admin.js 921531066 Niosemiro "Niosemiro@2026"
 */
const { PrismaClient, UserRole, AccountStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const [phone, name, password, email] = process.argv.slice(2);

if (!phone || !name || !password) {
  console.error('Uso: node scripts/create-admin.js <telefone> <nome> <palavra-passe> [email]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('A palavra-passe deve ter pelo menos 10 caracteres.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const data = {
    name,
    passwordHash,
    role: UserRole.ADMIN,
    status: AccountStatus.ACTIVE,
    email: email ? email.trim().toLowerCase() : null,
  };

  const existing = await prisma.user.findFirst({ where: { phone: phone.trim(), role: UserRole.ADMIN } });
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data: { ...data, phone: phone.trim() } });

  console.log(JSON.stringify({ id: user.id, phone: user.phone, name: user.name, role: user.role, status: user.status }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
