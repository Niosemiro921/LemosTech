const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SYSTEM SUMMARY: ALL DELIVERERS, COMPANIES, AND ORDERS ===\n');
  
  // Get all driver users (entregadores)
  const driverUsers = await prisma.user.findMany({ where: { role: 'DRIVER' } });
  
  // Get all supplier users (empresas)
  const supplierUsers = await prisma.user.findMany({ where: { role: 'SUPPLIER' } });
  
  // Get all customer users
  const customerUsers = await prisma.user.findMany({ where: { role: 'CUSTOMER' } });
  
  // Get all driver profiles with details
  const driverProfiles = await prisma.driverProfile.findMany({ take: 100 });
  
  // Get all supplier profiles with details
  const supplierProfiles = await prisma.supplierProfile.findMany({ take: 100 });
  
  // Get all orders
  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { email: true, phone: true } },
      supplier: { include: { user: { select: { email: true, phone: true } } } },
      driverOffers: { include: { driver: { include: { user: { select: { phone: true, email: true } } } } } }
    }
  });
  
  console.log('========================================');
  console.log('1. ENTREGADORES (DRIVERS) NO SISTEMA');
  console.log('========================================');
  driverUsers.forEach(u => {
    const profile = driverProfiles.find(dp => dp.userId === u.id);
    console.log(`\nID: ${u.id}`);
    console.log(`  Phone: ${u.phone}`);
    console.log(`  Email: ${u.email || 'N/A'}`);
    console.log(`  Name: ${profile?.fullName || 'N/A'}`);
    console.log(`  Vehicle: ${profile?.vehicleType || 'N/A'}`);
    console.log(`  License: ${profile?.documentNumber || 'N/A'}`);
    console.log(`  Plate: ${profile?.vehiclePlate || 'N/A'}`);
    console.log(`  Is Online: ${profile?.isOnline || false}`);
    console.log(`  Rating: ${profile?.ratingAverage || 'N/A'}`);
  });
  
  console.log('\n\n========================================');
  console.log('2. EMPRESAS (SUPPLIERS) NO SISTEMA');
  console.log('========================================');
  supplierUsers.forEach(u => {
    const profile = supplierProfiles.find(sp => sp.userId === u.id);
    console.log(`\nID: ${u.id}`);
    console.log(`  Phone: ${u.phone}`);
    console.log(`  Email: ${u.email || 'N/A'}`);
    console.log(`  Trade Name: ${profile?.tradeName || 'N/A'}`);
    console.log(`  Legal Name: ${profile?.legalName || 'N/A'}`);
    console.log(`  NIF: ${profile?.nif || 'N/A'}`);
    console.log(`  Address: ${profile?.address || 'N/A'}`);
    console.log(`  Coordinates: ${profile?.latitude}, ${profile?.longitude}`);
  });
  
  console.log('\n\n========================================');
  console.log('3. PEDIDOS NO SISTEMA');
  console.log('========================================');
  console.log('Total de pedidos:', orders.length);
  console.log('');
  
  // Group orders by status
  const statusCounts = {};
  orders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  console.log('Orders by status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // Show each order
  orders.forEach(o => {
    const cust = o.customer?.email || o.customer?.phone || 'N/A';
    const supp = o.supplier?.user?.email || o.supplier?.tradeName || 'N/A';
    const driverCount = o.driverOffers ? o.driverOffers.length : 0;
    const driverInfo = o.driverOffers ? o.driverOffers.map(function(d) {
      return 'driver ' + (d.driver?.user?.phone || 'N/A') + ' status:' + d.status;
    }).join(', ') : 'none';
    console.log(`\n${o.reference}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Customer: ${cust}`);
    console.log(`  Supplier: ${supp}`);
    console.log(`  Items: ${o.items ? o.items.length : 0}`);
    console.log(`  Driver Offers: [${driverInfo}]`);
  });
  
  console.log('\n\n========================================');
  console.log('4. RESUMO ESTATÍSTICO');
  console.log('========================================');
  console.log('Total de Utilizadores:', driverUsers.length + supplierUsers.length + customerUsers.length);
  console.log('  - Entregadores:', driverUsers.length);
  console.log('  - Empresas:', supplierUsers.length);
  console.log('  - Clientes:', customerUsers.length);
  console.log('Total de Pedidos:', orders.length);
  
  await prisma.$disconnect();
}

main()
  .then(() => console.log('\nDone.'))
  .catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });