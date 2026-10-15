const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Creating 5 test orders for driver +244900000902 ===\n');
  
  // Driver with phone +244900000902 - find the driver profile
  const driverUserId = '76740694-c157-4e61-9f77-822a39f550bb';
  const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
  console.log('Driver profile found:', driverProfile ? `ID: ${driverProfile.id}, Name: ${driverProfile.fullName}, Vehicle: ${driverProfile.vehicleType}` : 'NOT FOUND');
  const driverId = driverProfile ? driverProfile.id : null;
  
  // First, find a customer to create orders for
  const customerUsers = await prisma.user.findMany({ where: { role: 'CUSTOMER' } });
  const customerId = customerUsers[0].id;
  console.log('Using customer:', customerUsers[0].email, 'phone:', customerUsers[0].phone);
  
  // Find a supplier with profile
  const supplierUsers = await prisma.user.findMany({ where: { role: 'SUPPLIER' } });
  const supplierUserId = supplierUsers[0].id;
  const supplierProfile = await prisma.supplierProfile.findUnique({ where: { userId: supplierUserId } });
  console.log('Using supplier:', supplierProfile ? supplierProfile.tradeName : 'N/A', '(profile ID:', supplierProfile?.id || 'N/A', ')');
  
  // Check product variants available
  const variants = await prisma.productVariant.findMany({ take: 3 });
  console.log('Available variants:', variants.length);
  variants.forEach(v => console.log(` - ${v.sku}: ${v.name}, price: ${v.unitPrice}`));
  
  console.log('\n--- Creating 5 orders ---');
  
  const createdOrders = [];
  
  for (let i = 1; i <= 5; i++) {
    const reference = `GE-2024-${i.toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    // Create order via Prisma transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // Create the order - supplierId references SupplierProfile.id
      const orderData = await tx.order.create({
        data: {
          reference,
          customerId,
          supplierId: supplierProfile.id, // Use SupplierProfile ID, not User ID
          status: 'AWAITING_SUPPLIER_ACCEPTANCE',
          deliveryType: 'EXPRESS',
          paymentMethod: 'PAY_ON_DELIVERY',
          deliveryAddress: `Avenida Independência, Casa ${i}, Luanda`,
          latitude: -8.8279 + (i * 0.001),
          longitude: 13.2309 + (i * 0.001),
          subtotal: 3500 * (i + 1),
          deliveryFee: 2000,
          platformFee: 280,
          discount: 0,
          cylinderFee: 0,
          total: 3500 * (i + 1) + 2000 + 280,
          currency: 'AOA',
          distanceKm: 5.0 + i,
          estimatedMinutes: 20 + (i * 10),
          pricingVersion: 'v1',
          bottleExchangeType: 'REFILL_EXCHANGE',
          bottleBrand: 'Sonangol',
          valveType: 'QUICK_20MM',
          deliveryNotes: `Entrega de teste ${i}`,
          items: {
            create: [
              {
                variantId: variants[0].id,
                variantName: variants[0].name,
                weightKg: variants[0].weightKg,
                quantity: i + 1,
                unitPrice: variants[0].unitPrice,
                lineTotal: variants[0].unitPrice * (i + 1),
              }
            ]
          },
          statusHistory: {
            create: { status: 'AWAITING_SUPPLIER_ACCEPTANCE', note: 'Pedido criado para teste' }
          }
        },
        include: { items: true }
      });
      
      // Create delivery linked to this order and the driver
      // delivery.driverId references DriverProfile.id
      await tx.delivery.create({
        data: {
          orderId: orderData.id,
          driverId: driverId, // Use DriverProfile ID, not User ID
          status: 'DELIVERED', // Set as delivered for chat testing
          pickupAddress: `Depósito Central, Luanda`,
          pickupLatitude: -8.8279,
          pickupLongitude: 13.2309,
          dropoffAddress: `Avenida Independência, Casa ${i}, Luanda`,
          dropoffLatitude: -8.8279 + (i * 0.001),
          dropoffLongitude: 13.2309 + (i * 0.001),
          assignedAt: new Date(),
          acceptedAt: new Date(),
          pickedUpAt: new Date(),
          arrivedAt: new Date(),
          deliveredAt: new Date(),
          statusHistory: {
            create: { status: 'DELIVERED', note: 'Entrega de teste via script' }
          }
        }
      });
      
      // Create driver offer linking driver to order
      // driverOffer.driverId references DriverProfile.id too
      await tx.driverOffer.create({
        data: {
          orderId: orderData.id,
          driverId: driverId,
          status: 'ACCEPTED',
          distanceToPickupKm: 5.0 + i,
          estimatedPickupMinutes: 20 + (i * 10),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          respondedAt: new Date(),
          createdAt: new Date(),
        }
      });
      
      return orderData;
    });
    
    createdOrders.push(newOrder);
    console.log(`Order ${i}: ${newOrder.reference} - Status: ${newOrder.status}, Total: ${newOrder.total}AOA, Items: ${newOrder.items.length}`);
  }
  
  console.log('\n=== Summary ===');
  console.log('Created 5 orders with deliveries and driver offers for driver +244900000902');
  
  // Verify by listing the orders with driver info
  console.log('\n--- Verifying orders ---');
  for (const order of createdOrders) {
    const delivery = await prisma.delivery.findFirst({ where: { orderId: order.id } });
    const offer = await prisma.driverOffer.findFirst({ where: { orderId: order.id } });
    const chatThread = await prisma.chatThread.findFirst({ where: { orderId: order.id } });
    console.log(`Order ${order.reference}: deliveryStatus=${delivery?.status}, offerStatus=${offer?.status}, chatThread=${chatThread ? 'exists' : 'none'}`);
  }
  
  await prisma.$disconnect();
}

main()
  .then(() => console.log('\nDone.'))
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());