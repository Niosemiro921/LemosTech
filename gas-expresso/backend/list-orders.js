const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ALL ORDERS IN DATABASE ===\n');
  
  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { email: true, phone: true } },
      supplier: { include: { user: { select: { email: true, phone: true } } } },
      driverOffers: { include: { driver: { include: { user: { select: { phone: true, email: true } } } } } }
    }
  });
  
  console.log('Total:', orders.length);
  console.log('========================================');
  orders.forEach(o => {
    const cust = o.customer?.email || o.customer?.phone || 'N/A';
    const supp = o.supplier?.user?.email || o.supplier?.tradeName || 'N/A';
    const driverCount = o.driverOffers ? o.driverOffers.length : 0;
    const driverInfos = o.driverOffers ? o.driverOffers.map(function(d) {
      return 'driver ' + (d.driver?.user?.phone || 'N/A') + ' (' + (d.driver?.user?.email || 'N/A') + ') status:' + d.status;
    }).join(', ') : 'no driver offers';
    console.log('Ref: ' + o.reference + ' | Status: ' + o.status + ' | Customer: ' + cust + ' | Supplier: ' + supp + ' | DriverOffers: [' + driverInfos + '] | Items: ' + (o.items ? o.items.length : 0));
  });
  console.log('========================================');
  
  await prisma.$disconnect();
}

main()
  .then(() => console.log('\nDone.'))
  .catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });