const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suppliers = await prisma.supplierProfile.findMany({
    where: { user: { status: 'ACTIVE', role: 'SUPPLIER' } },
    include: { user: true, inventory: { take: 5 } },
  });
  const customers = await prisma.customerProfile.findMany({
    where: { user: { status: 'ACTIVE', role: 'CUSTOMER' } },
    include: { user: true },
  });

  console.log('=== Active suppliers (' + suppliers.length + ') ===');
  suppliers.forEach(s => {
    console.log(`- ${s.tradeName} | lat=${s.latitude} lng=${s.longitude} | user=${s.user.email} | inventory=${s.inventory.length}`);
    s.inventory.forEach(it => console.log(`    * ${it.name} | price=${it.unitPrice} | stock=${it.stockQuantity} | active=${it.isActive}`));
  });

  console.log('\n=== Active customers (' + customers.length + ') ===');
  customers.slice(0, 5).forEach(c => console.log(`- ${c.fullName} | phone=${c.user.phone} | email=${c.user.email}`));

  const orderCount = await prisma.order.count();
  console.log('\nTotal orders in DB:', orderCount);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); });