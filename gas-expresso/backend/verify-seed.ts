import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const suppliers = await prisma.supplierProfile.findMany({
    include: { user: true, inventory: true },
  });

  const testSuppliers = suppliers.filter((s) => s.user.phone.startsWith('TEST-SEED-'));
  console.log('Total fornecedores de teste:', testSuppliers.length);

  const activeTestSuppliers = testSuppliers.filter((s) => s.user.status === 'ACTIVE');
  console.log('Ativos:', activeTestSuppliers.length);

  const withInventory = activeTestSuppliers.filter((s) => s.inventory.length > 0 && s.inventory.every((inv) => inv.availableQty > 0));
  console.log('Com inventário positivo em todas as variantes:', withInventory.length);

  for (const s of testSuppliers.slice(0, 3)) {
    console.log('Exemplo:', s.tradeName, 'Telefone:', s.user.phone, 'Status:', s.user.status, 'Inventory:', s.inventory.map((i) => ({ variantId: i.variantId, qty: i.availableQty })));
  }

  await prisma.$disconnect();
}

verify().catch(console.error);
