import { AccountStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const demoPhone = '923000010';
const demoPassword = 'Demo@123';
const demoPasswordHash = bcrypt.hashSync(demoPassword, 12);

const TEST_PREFIX = 'TEST-SEED-';

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

const zones = [
  { name: 'Ingombota', lat: -8.815, lng: 13.240 },
  { name: 'Maianga', lat: -8.820, lng: 13.245 },
  { name: 'Mutamba', lat: -8.830, lng: 13.230 },
  { name: 'Rangel', lat: -8.810, lng: 13.250 },
  { name: 'Cazenga', lat: -8.800, lng: 13.220 },
  { name: 'Sambizanga', lat: -8.790, lng: 13.235 },
  { name: 'Samba', lat: -8.785, lng: 13.210 },
  { name: 'Talatona', lat: -8.850, lng: 13.280 },
  { name: 'Benfica', lat: -8.835, lng: 13.215 },
  { name: 'Camama', lat: -8.780, lng: 13.260 },
  { name: 'Kilamba', lat: -8.860, lng: 13.290 },
  { name: 'Viana', lat: -8.800, lng: 13.200 },
  { name: 'Cacuaco', lat: -8.810, lng: 13.190 },
  { name: 'Bairro da Paz', lat: -8.825, lng: 13.255 },
  { name: 'Rubro', lat: -8.795, lng: 13.270 },
];

function getTestPhone(index: number) {
  return `${TEST_PREFIX}${String(index).padStart(3, '0')}`;
}

function getTestEmail(index: number) {
  return `teste.semente.${index}@lemostech.test`;
}

async function seedDemo() {
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
          latitude: -8.8139,
          longitude: 13.233,
        },
        create: {
          userId: user.id,
          legalName: profile.legalName,
          tradeName: profile.tradeName,
          nif: profile.nif,
          responsibleName: profile.responsibleName,
          latitude: -8.8139,
          longitude: 13.233,
        },
      });
    }
  }

  const supplierUser = await prisma.user.findFirst({ where: { role: UserRole.SUPPLIER, phone: demoPhone } });
  if (supplierUser) {
    const supplierProfile = await prisma.supplierProfile.findUnique({ where: { userId: supplierUser.id } });
    if (supplierProfile) {
      const variantsData = [
        { sku: 'GE-6KG', qty: 50 },
        { sku: 'GE-12KG', qty: 40 },
        { sku: 'GE-45KG', qty: 20 },
      ];
      for (const v of variantsData) {
        const variant = await prisma.productVariant.findUnique({ where: { sku: v.sku } });
        if (variant) {
          await prisma.inventoryItem.upsert({
            where: { supplierId_variantId: { supplierId: supplierProfile.id, variantId: variant.id } },
            update: { availableQty: v.qty, reservedQty: 0, reorderLevel: 5 },
            create: { supplierId: supplierProfile.id, variantId: variant.id, availableQty: v.qty, reservedQty: 0, reorderLevel: 5 },
          });
        }
      }
    }
  }

  const driverUser = await prisma.user.findFirst({ where: { role: UserRole.DRIVER, phone: demoPhone } });
  if (driverUser) {
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUser.id } });
    if (driverProfile) await prisma.driverProfile.update({ where: { id: driverProfile.id }, data: { latitude: -8.8139, longitude: 13.233, isOnline: true } });
  }
}

async function seedTestSuppliers() {
  const testPasswordHash = bcrypt.hashSync('Teste@123', 12);
  const variantIds = await prisma.productVariant.findMany({ where: { active: true }, select: { id: true, sku: true } });
  const skuToId = new Map(variantIds.map((v) => [v.sku, v.id]));

  for (let i = 1; i <= 50; i++) {
    const testPhone = getTestPhone(i);
    const testEmail = getTestEmail(i);
    const zone = zones[(i - 1) % zones.length];
    const tradeName = `Fornecedora Teste ${i} — ${zone.name}`;

    const existing = await prisma.user.findFirst({ where: { phone: testPhone, role: UserRole.SUPPLIER } });
    if (existing) {
      const profile = await prisma.supplierProfile.findUnique({ where: { userId: existing.id } });
      if (!profile) {
        await prisma.supplierProfile.create({
          data: {
            userId: existing.id,
            legalName: tradeName,
            tradeName: tradeName,
            nif: `TEST-NIF-${String(i).padStart(5, '0')}`,
            responsibleName: `Responsável Teste ${i}`,
            province: 'Luanda',
            municipality: zone.name,
            neighborhood: 'Sintético',
            address: `Rua Sintética ${i}, ${zone.name}`,
            latitude: zone.lat + (Math.random() * 0.003 - 0.0015),
            longitude: zone.lng + (Math.random() * 0.003 - 0.0015),
            phoneAlt: `92300${String(i).padStart(4, '0')}`,
          },
        });
      }
      continue;
    }

    const user = await prisma.user.create({
      data: {
        phone: testPhone,
        email: testEmail,
        passwordHash: testPasswordHash,
        role: UserRole.SUPPLIER,
        status: AccountStatus.ACTIVE,
        name: `Fornecedor Teste ${i}`,
      },
    });

    const supplierProfile = await prisma.supplierProfile.create({
      data: {
        userId: user.id,
        legalName: tradeName,
        tradeName: tradeName,
        nif: `TEST-NIF-${String(i).padStart(5, '0')}`,
        responsibleName: `Responsável Teste ${i}`,
        province: 'Luanda',
        municipality: zone.name,
        neighborhood: 'Sintético',
        address: `Rua Sintética ${i}, ${zone.name}`,
        latitude: zone.lat + (Math.random() * 0.003 - 0.0015),
        longitude: zone.lng + (Math.random() * 0.003 - 0.0015),
        phoneAlt: `92300${String(i).padStart(4, '0')}`,
      },
    });

    for (const [sku, qty] of [['GE-6KG', 20 + Math.floor(Math.random() * 10)], ['GE-12KG', 15 + Math.floor(Math.random() * 10)], ['GE-45KG', 8 + Math.floor(Math.random() * 5)]]) {
      const variantId = skuToId.get(sku);
      if (!variantId) continue;
      await prisma.inventoryItem.upsert({
        where: { supplierId_variantId: { supplierId: supplierProfile.id, variantId } },
        update: { availableQty: qty, reservedQty: 0, reorderLevel: 5 },
        create: { supplierId: supplierProfile.id, variantId, availableQty: qty, reservedQty: 0, reorderLevel: 5 },
      });
    }
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_CONFIRMED) {
    console.error('Ambiente de produção detectado. Defina SEED_CONFIRMED=1 para confirmar execução do seed de teste.');
    process.exit(1);
  }

  console.log('A iniciar seed... Dados sintéticos identificados por prefixo TEST-SEED- e emails teste.semente.*');
  await seedDemo();
  await seedTestSuppliers();
  console.log('Seed concluído. 50 empresas de teste criadas (telefone TEST-SEED-###). Estas são dados sintéticos para desenvolvimento e testes locais apenas.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
