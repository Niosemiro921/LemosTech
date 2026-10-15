const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking existing users ===\n');
  
  // Find existing users with demo phone or the user's phone, and drivers
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { phone: '9230000010' },
        { phone: '+244900000902' },
        { role: 'DRIVER' }
      ]
    }
  });
  
  console.log('Existing users with those phones/drivers:');
  existingUsers.forEach(u => {
    console.log(`- Phone: ${u.phone}, Role: ${u.role}, Email: ${u.email}, Id: ${u.id}`);
  });
  
  // Check for driver profiles
  const driverUsers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    include: { driverProfile: true }
  });
  
  console.log('\nDriver users:');
  driverUsers.forEach(u => {
    console.log(`- User: ${u.email}, Phone: ${u.phone}, DriverProfile: ${u.driverProfile ? u.driverProfile.fullName : 'N/A'}, Plate: ${u.driverProfile ? u.driverProfile.vehiclePlate : 'N/A'}`);
  });
  
  // Check customers
  const customerUsers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    include: { customerProfile: true }
  });
  
  console.log('\nCustomer users:');
  customerUsers.forEach(u => {
    console.log(`- User: ${u.email}, Phone: ${u.phone}, CustomerProfile: ${u.customerProfile ? u.customerProfile.fullName : 'N/A'}`);
  });
  
  // Check suppliers
  const supplierUsers = await prisma.user.findMany({
    where: { role: 'SUPPLIER' },
    include: { supplierProfile: true }
  });
  
  console.log('\nSupplier users:');
  supplierUsers.forEach(u => {
    console.log(`- User: ${u.email}, Phone: ${u.phone}, SupplierProfile: ${u.supplierProfile ? u.supplierProfile.tradeName : 'N/A'}`);
  });
  
  await prisma.$disconnect();
}

main()
  .then(() => console.log('\nDone.'))
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());