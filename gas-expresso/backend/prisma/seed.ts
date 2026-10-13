import { AccountStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const demoPhone = '923000010';
const demoPassword = 'Demo@123';
const demoPasswordHash = bcrypt.hashSync(demoPassword, 12);

const demoProfiles: Array<{
  role: UserRole;
  email: string;
  fullName?: string;
  documentNumber?: string;
  vehicleType?: string;
  legalName?: string;
  tradeName?: string;
  nif?: string;
  responsibleName?: string;
}> = [
  { role: UserRole.CUSTOMER, email: 'cliente.demo@lemostech.test', fullName: 'Cliente Demo' },
  { role: UserRole.DRIVER, email: 'entregador.demo@lemostech.test', fullName: 'Entregador Demo', documentNumber: '0000000000A', vehicleType: 'MOTORCYCLE' },
  { role: UserRole.SUPPLIER, email: 'fornecedor.demo@lemostech.test', legalName: 'Distribuidora Demo', tradeName: 'Demo Gás', nif: '900000000', responsibleName: 'Responsável Demo' },
  { role: UserRole.ADMIN, email: 'admin.demo@lemostech.test' },
];

async function main() {
  const product = await prisma.product.upsert({
    where: { slug: 'gas-engarrafado' },
    update: { name: 'Gás Engarrafado', active: true },
    create: {
      slug: 'gas-engarrafado',
      name: 'Gás Engarrafado',
      description: 'Catálogo de botijas de gás disponíveis para encomenda.',
    },
  });

  const variants = [
    { sku: 'GE-6KG', name: 'Botija 6 KG', weightKg: 6, unitPrice: 3500, cylinderPrice: 12000 },
    { sku: 'GE-12KG', name: 'Botija 12 KG', weightKg: 12, unitPrice: 7000, cylinderPrice: 18000 },
    { sku: 'GE-45KG', name: 'Botija 45 KG', weightKg: 45, unitPrice: 18000, cylinderPrice: 35000 },
  ];

  for (const variant of variants) {
    await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: {
        productId: product.id,
        name: variant.name,
        weightKg: variant.weightKg,
        unitPrice: variant.unitPrice,
        active: true,
      },
      create: { productId: product.id, ...variant },
    });
  }

  for (const profile of demoProfiles) {
    const existingUser = await prisma.user.findFirst({
      where: { phone: demoPhone, role: profile.role },
    });

    const user = existingUser ?? await prisma.user.create({
      data: {
        phone: demoPhone,
        email: profile.email,
        passwordHash: demoPasswordHash,
        role: profile.role,
        status: AccountStatus.ACTIVE,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: profile.email,
        passwordHash: demoPasswordHash,
        status: AccountStatus.ACTIVE,
      },
    });

    if (profile.role === UserRole.CUSTOMER) {
      await prisma.customerProfile.upsert({
        where: { userId: user.id },
        update: { fullName: profile.fullName },
        create: { userId: user.id, fullName: profile.fullName },
      });
    }

    if (profile.role === UserRole.DRIVER) {
      await prisma.driverProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: profile.fullName,
          documentNumber: profile.documentNumber,
          vehicleType: profile.vehicleType,
        },
        create: {
          userId: user.id,
          fullName: profile.fullName,
          documentNumber: profile.documentNumber,
          vehicleType: profile.vehicleType,
        },
      });
    }

    if (profile.role === UserRole.SUPPLIER) {
      await prisma.supplierProfile.upsert({
        where: { userId: user.id },
        update: {
          legalName: profile.legalName,
          tradeName: profile.tradeName,
          nif: profile.nif,
          responsibleName: profile.responsibleName,
        },
        create: {
          userId: user.id,
          legalName: profile.legalName,
          tradeName: profile.tradeName,
          nif: profile.nif,
          responsibleName: profile.responsibleName,
        },
      });
    }
  }

  console.log(`Catálogo inicial carregado. Utilizadores demo criados com o número ${demoPhone} e palavra-passe ${demoPassword}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
