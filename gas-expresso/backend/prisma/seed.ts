import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    { sku: 'GE-6KG', name: 'Botija 6 KG', weightKg: 6, unitPrice: 3500 },
    { sku: 'GE-12KG', name: 'Botija 12 KG', weightKg: 12, unitPrice: 7000 },
    { sku: 'GE-45KG', name: 'Botija 45 KG', weightKg: 45, unitPrice: 18000 },
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

  console.log('Catálogo inicial carregado. Contas, fornecedores e entregadores devem ser criados pela aplicação.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
