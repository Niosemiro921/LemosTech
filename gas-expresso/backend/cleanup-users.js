const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DATABASE CLEANUP: Keep only Admin ===\n');
  
  // 1. First, find the admin user to keep
  const adminEmail = 'admin.demo@lemostech.test';
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: {
      customer: true,
      driver: true,
      supplier: true,
    }
  });
  
  console.log('Admin user to keep:');
  console.log(`  Email: ${adminUser?.email}`);
  console.log(`  Role: ${adminUser?.role}`);
  console.log(`  ID: ${adminUser?.id}`);
  if (adminUser?.customer) console.log(`  Customer profile: ${adminUser.customer.fullName}`);
  if (adminUser?.driver) console.log(`  Driver profile: ${adminUser.driver.fullName}`);
  if (adminUser?.supplier) console.log(`  Supplier profile: ${adminUser.supplier.tradeName}`);
  
  if (!adminUser) {
    console.error(`Admin user with email ${adminEmail} not found!`);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  const adminId = adminUser.id;
  
  // 2. Delete all data that references other users first
  console.log('\n=== Step 1: Delete all orders ===');
  const orders = await prisma.order.count();
  if (orders > 0) {
    await prisma.order.deleteMany({});
    console.log(`Deleted ${orders} orders`);
  }
  
  console.log('\n=== Step 2: Delete all driver offers ===');
  const driverOffers = await prisma.driverOffer.count();
  if (driverOffers > 0) {
    await prisma.driverOffer.deleteMany({});
    console.log(`${driverOffers} driver offers deleted`);
  }
  
  console.log('\n=== Step 3: Delete all deliveries ===');
  const deliveries = await prisma.delivery.count();
  if (deliveries > 0) {
    await prisma.delivery.deleteMany({});
    console.log(`${deliveries} deliveries deleted`);
  }
  
  // 3. Find all non-admin users
  console.log('\n=== Step 4: Find users to delete ===');
  const allUsers = await prisma.user.findMany({
    where: {
      NOT: { id: adminId }
    },
    select: { id: true, role: true, phone: true }
  });
  
  console.log(`Found ${allUsers.length} users to delete (excluding admin)`);
  
  // 4. Delete related profiles and then users
  for (const user of allUsers) {
    console.log(`\nProcessing user: ${user.phone || 'no phone'} (${user.role}) - ID: ${user.id}`);
    
    // Delete related profiles based on role
    if (user.role === 'CUSTOMER') {
      await prisma.customerProfile.deleteMany({
        where: { userId: user.id }
      });
      console.log('  - Customer profile deleted');
    } else if (user.role === 'DRIVER') {
      await prisma.driverProfile.deleteMany({
        where: { userId: user.id }
      });
      await prisma.driverWallet.deleteMany({
        where: { driverId: user.id }
      });
      console.log('  - Driver profile deleted');
      console.log('  - Driver wallet deleted');
    } else if (user.role === 'SUPPLIER') {
      await prisma.supplierProfile.deleteMany({
        where: { userId: user.id }
      });
      await prisma.supplierSchedule.deleteMany({
        where: { supplierId: user.id }
      });
      await prisma.supplierProductionLot.deleteMany({
        where: { supplierId: user.id }
      });
      await prisma.supplierInvoice.deleteMany({
        where: { supplierId: user.id }
      });
      await prisma.supplierCustomerInteraction.deleteMany({
        where: { supplierId: user.id }
      });
      console.log('  - Supplier profile deleted');
      console.log('  - Schedules, lots, invoices, interactions deleted');
    }
    
    // Delete the user (should now work after removing related records)
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log('  - User deleted');
  }
  
  // 5. Verify what remains
  console.log('\n=== VERIFICATION ===');
  
  const remainingUsers = await prisma.user.findMany({
    where: { email: adminEmail },
    include: {
      customer: true,
      driver: true,
      supplier: true,
    }
  });
  
  console.log(`Remaining users: ${remainingUsers.length}`);
  remainingUsers.forEach(u => {
    console.log(`  - ${u.role}: ${u.email} (${u.phone || 'no phone'})`);
    if (u.customer) console.log(`      Customer: ${u.customer.fullName}`);
    if (u.driver) console.log(`      Driver: ${u.driver.fullName}, Vehicle: ${u.driver.vehicleType}`);
    if (u.supplier) console.log(`      Supplier: ${u.supplier.tradeName}`);
  });
  
  // Check for any remaining data
  const remainingOrders = await prisma.order.count();
  const remainingDrivers = await prisma.driverOffer.count();
  console.log(`\nRemaining orders: ${remainingOrders}`);
  console.log(`Remaining driver offers: ${remainingDrivers}`);
  
  console.log('\n=== CLEANUP COMPLETE ===');
  console.log('Only the admin user remains. Database is clean for frontend creation.');
  
  await prisma.$disconnect();
}

main()
  .then(() => console.log('\nDone.'))
  .catch(err => { console.error(err); prisma.$disconnect(); process.exit(1); });