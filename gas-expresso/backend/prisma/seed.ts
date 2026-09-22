import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const product = await prisma.product.upsert({
    where: { slug: 'gas-engarrafado' },
    update: { name: 'Gás Engarrafado', active: true },
    create: {
      slug: 'gas-engarrafado',
      name: 'Gás Engarrafado',
      description: 'Catálogo inicial de desenvolvimento do Gás Expresso.',
    },
  });

  const variants = [
    { sku: 'GE-6KG', name: 'Botija 6 KG', weightKg: 6, unitPrice: 3500 },
    { sku: 'GE-12KG', name: 'Botija 12 KG', weightKg: 12, unitPrice: 7000 },
    { sku: 'GE-45KG', name: 'Botija 45 KG', weightKg: 45, unitPrice: 18000 },
  ];

  const variantRecords = [];
  for (const variant of variants) {
    variantRecords.push(
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
      }),
    );
  }

  // Demo supplier: use only for local development/testing.
  const supplierUser = await prisma.user.upsert({
    where: { phone: '923000010' },
    update: { passwordHash, role: UserRole.SUPPLIER, status: AccountStatus.ACTIVE },
    create: {
      phone: '923000010',
      email: 'supplier.demo@gasexpresso.local',
      passwordHash,
      role: UserRole.SUPPLIER,
      status: AccountStatus.ACTIVE,
    },
  });

  const supplier = await prisma.supplierProfile.upsert({
    where: { userId: supplierUser.id },
    update: {
      legalName: 'Gás Expresso Demo Lda.',
      tradeName: 'Gás Expresso Demo',
      nif: '999999999',
      responsibleName: 'Operador Demo',
      latitude: -8.839,
      longitude: 13.289,
    },
    create: {
      userId: supplierUser.id,
      legalName: 'Gás Expresso Demo Lda.',
      tradeName: 'Gás Expresso Demo',
      nif: '999999999',
      responsibleName: 'Operador Demo',
      latitude: -8.839,
      longitude: 13.289,
    },
  });

  for (const variant of variantRecords) {
    await prisma.inventoryItem.upsert({
      where: { supplierId_variantId: { supplierId: supplier.id, variantId: variant.id } },
      update: { availableQty: 50, reorderLevel: 10 },
      create: { supplierId: supplier.id, variantId: variant.id, availableQty: 50, reorderLevel: 10 },
    });
  }

  // Demo driver: use only for local development/testing.
  const driverUser = await prisma.user.upsert({
    where: { phone: '923000011' },
    update: { passwordHash, role: UserRole.DRIVER, status: AccountStatus.ACTIVE },
    create: {
      phone: '923000011',
      email: 'driver.demo@gasexpresso.local',
      passwordHash,
      role: UserRole.DRIVER,
      status: AccountStatus.ACTIVE,
    },
  });

  await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: {
      fullName: 'Motorista Demo',
      documentNumber: 'DEV-0001',
      vehicleType: 'Carrinha',
      vehicleCapacityKg: 45,
      latitude: -8.841,
      longitude: 13.291,
      isOnline: false,
      ratingAverage: 5,
      acceptanceRate: 1,
    },
    create: {
      userId: driverUser.id,
      fullName: 'Motorista Demo',
      documentNumber: 'DEV-0001',
      vehicleType: 'Carrinha',
      vehicleCapacityKg: 45,
      latitude: -8.841,
      longitude: 13.291,
      isOnline: false,
      ratingAverage: 5,
      acceptanceRate: 1,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { phone: '923000012' },
    update: { passwordHash, role: UserRole.CUSTOMER, status: AccountStatus.ACTIVE },
    create: {
      phone: '923000012',
      email: 'customer.demo@gasexpresso.local',
      passwordHash,
      role: UserRole.CUSTOMER,
      status: AccountStatus.ACTIVE,
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: { fullName: 'Cliente Demo' },
    create: { userId: customerUser.id, fullName: 'Cliente Demo' },
  });

  console.log('Seed concluído.');
  console.log(`Contas demo criadas/atualizadas com a palavra-passe definida por SEED_DEMO_PASSWORD (por padrão: ${demoPassword}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
