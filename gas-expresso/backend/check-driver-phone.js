const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const phone = process.argv[2] || '925311672';
  const user = await prisma.user.findFirst({
    where: { phone },
    include: { driver: true, customer: true, supplier: true }
  });
  console.log('=== Lookup for phone', phone, '===');
  console.log(user ? JSON.stringify({
    id: user.id, email: user.email, phone: user.phone, role: user.role,
    status: user.status,
    driver: user.driver ? {
      fullName: user.driver.fullName,
      vehiclePlate: user.driver.vehiclePlate,
      isOnline: user.driver.isOnline,
      approved: user.driver.approved ?? user.driver.status ?? null
    } : null
  }, null, 2) : 'NOT FOUND');

  const allDrivers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    include: { driverProfile: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log('\n=== All drivers (max 20) ===');
  allDrivers.forEach(u => console.log(`- ${u.phone} | ${u.email} | id=${u.id} | online=${u.driverProfile?.isOnline} | plate=${u.driverProfile?.vehiclePlate ?? 'N/A'}`));

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); });
