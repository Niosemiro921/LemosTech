const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking existing users ===\n');
  
  // Find existing users with the user's phone numbers
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { phone: '9230000010' },
        { phone: '+244900000902' }
      ]
    }
  });
  
  console.log('Existing users with those phones:');
  existingUsers.forEach(u => {
    console.log(`- Phone: ${u.phone}, Role: ${u.role}, Email: ${u.email}, Id: ${u.id}`);
  });
  
  // Check for driver users
  const driverUsers = await prisma.user.findMany({
    where: { role: 'DRIVER' }
  });
  
  console.log('\nDriver users (basic info):');
  driverUsers.forEach(u => {
    console.log(`- Phone: ${u.phone}, Email: ${u.email}, Id: ${u.id}`);
  });
  
  // Check driver profiles separately
  const driverProfiles = await prisma.driverProfile.findMany({
    take: 10
  });
  
  console.log('\nDriver profiles (first 10):');
  for (const dp of driverProfiles) {
    const user = await prisma.user.findUnique({ where: { id: dp.userId } });
    console.log(`- Name: ${user ? user.email : 'N/A'}, Phone: ${user ? user.phone : 'N/A'}, Driver Name: ${dp.fullName}, Plate: ${dp.vehiclePlate}, Type: ${dp.vehicleType}`);
  }
  
  // Check customers
  const customerUsers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' }
  });
  
  console.log('\nCustomer users:');
  customerUsers.forEach(u => {
    console.log(`- Phone: ${u.phone}, Email: ${u.email}, Id: ${u.id}`);
  });
  
  // Check customer profiles
  const customerProfiles = await prisma.customerProfile.findMany({
    take: 10
  });
  
  console.log('\nCustomer profiles (first 10):');
  for (const cp of customerProfiles) {
    const user = await prisma.user.findUnique({ where: { id: cp.userId } });
    console.log(`- User: ${user ? user.email : 'N/A'}, Phone: ${user ? user.phone : 'N/A'}, Name: ${cp.fullName}`);
  }
  
  // Check suppliers
  const supplierUsers = await prisma.user.findMany({
    where: { role: 'SUPPLIER' }
  });
  
  console.log('\nSupplier users:');
  supplierUsers.forEach(u => {
    console.log(`- Phone: ${u.phone}, Email: ${u.email}, Id: ${u.id}`);
  });
  
  // Check supplier profiles
  const supplierProfiles = await prisma.supplierProfile.findMany({
    take: 10
  });
  
  console.log('\nSupplier profiles (first 10):');
  for (const sp of supplierProfiles) {
    const user = await prisma.user.findUnique({ where: { id: sp.userId } });
    console.log(`- User: ${user ? user.email : 'N/A'}, Name: ${sp.tradeName}, NIF: ${sp.nif}`);
  }
  
  await prisma.$disconnect();
}

main()
  .then(() => console.log('\nDone.'))
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());