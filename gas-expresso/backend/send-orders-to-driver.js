const { PrismaClient, UserRole, OrderStatus, DeliveryStatus, DriverOfferStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Get the target driver (phone 925311672)
  const driverUser = await prisma.user.findFirst({
    where: { phone: '925311672' },
    include: { driver: true }
  });
  
  if (!driverUser || !driverUser.driver) {
    console.error('Driver not found');
    return;
  }
  
  const driverProfile = driverUser.driver;
  console.log('=== Target Driver ===');
  console.log(`User ID: ${driverUser.id}`);
  console.log(`Driver Profile ID: ${driverProfile.id}`);
  console.log(`Name: ${driverProfile.fullName}`);
  console.log(`Current: online=${driverProfile.isOnline}, lat=${driverProfile.latitude}, lng=${driverProfile.longitude}`);
  
  // 2. Pick a supplier near the driver location (or set driver near a supplier)
  // Let's pick "Demo Gás" supplier which is at lat=-8.8139 lng=13.233
  const demoSupplier = await prisma.supplierProfile.findFirst({
    where: { tradeName: 'Demo Gás' },
    include: { user: true, inventory: { where: { availableQty: { gt: 0 } } } }
  });
  
  if (!demoSupplier) {
    console.error('Demo Gás supplier not found');
    return;
  }
  
  console.log('\n=== Selected Supplier ===');
  console.log(`Trade Name: ${demoSupplier.tradeName}`);
  console.log(`Profile ID: ${demoSupplier.id}`);
  console.log(`Location: lat=${demoSupplier.latitude}, lng=${demoSupplier.longitude}`);
  console.log(`Active inventory items: ${demoSupplier.inventory.length}`);
  
  // Get product variants from this supplier's inventory
  const variantIds = demoSupplier.inventory.map(i => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, active: true }
  });
  console.log('Available variants:', variants.map(v => `${v.sku} (${v.name}) price=${v.unitPrice} weight=${v.weightKg}kg`));
  
  // 3. Pick a customer
  const customerUsers = await prisma.user.findMany({ 
    where: { role: 'CUSTOMER', status: 'ACTIVE' },
    include: { customer: true }
  });
  const customer = customerUsers[0];
  console.log('\n=== Selected Customer ===');
  console.log(`User ID: ${customer.id}`);
  console.log(`Name: ${customer.customer?.fullName}`);
  console.log(`Phone: ${customer.phone}`);
  
  // 4. Put driver ONLINE at supplier location (so they get the offer)
  console.log('\n--- Setting driver online at supplier location ---');
  await prisma.driverProfile.update({
    where: { id: driverProfile.id },
    data: { 
      isOnline: true, 
      latitude: demoSupplier.latitude,
      longitude: demoSupplier.longitude,
      lastLocationAt: new Date()
    }
  });
  console.log('Driver is now ONLINE at supplier coordinates');
  
  // 5. Create 3 test orders through the full flow
  console.log('\n--- Creating 3 test orders ---');
  const createdOrders = [];
  
  for (let i = 1; i <= 3; i++) {
    const item = variants[0]; // Use first available variant
    const quantity = i; // 1, 2, 3 items
    
    // Customer location near supplier (within 5km)
    const custLat = demoSupplier.latitude + (Math.random() - 0.5) * 0.02; // ~1km variation
    const custLng = demoSupplier.longitude + (Math.random() - 0.5) * 0.02;
    const distanceKm = Math.round(
      2 * 6371 * Math.asin(Math.sqrt(
        Math.sin((custLat - demoSupplier.latitude) * Math.PI / 360) ** 2 +
        Math.cos(demoSupplier.latitude * Math.PI / 180) * Math.cos(custLat * Math.PI / 180) *
        Math.sin((custLng - demoSupplier.longitude) * Math.PI / 360) ** 2
      )) * 100
    ) / 100;
    
    const subtotal = item.unitPrice * quantity;
    const deliveryFee = Math.round(1500 + distanceKm * 180); // EXPRESS
    const platformFee = Math.round(subtotal * 0.08);
    const total = subtotal + deliveryFee + platformFee;
    
    const reference = `GE-${new Date().getUTCFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    // Create order with transaction (replicating OrderService.create)
    const order = await prisma.$transaction(async (tx) => {
      // Reserve inventory
      await tx.inventoryItem.updateMany({
        where: { supplierId: demoSupplier.id, variantId: item.id, availableQty: { gte: quantity } },
        data: { availableQty: { decrement: quantity }, reservedQty: { increment: quantity } }
      });
      
      const newOrder = await tx.order.create({
        data: {
          reference,
          customerId: customer.id,
          supplierId: demoSupplier.id,
          status: OrderStatus.AWAITING_SUPPLIER_ACCEPTANCE,
          deliveryType: 'EXPRESS',
          paymentMethod: 'PAY_ON_DELIVERY',
          deliveryAddress: `Rua de Teste ${i}, Luanda`,
          latitude: custLat,
          longitude: custLng,
          subtotal,
          deliveryFee,
          platformFee,
          discount: 0,
          cylinderFee: 0,
          total,
          currency: 'AOA',
          distanceKm,
          estimatedMinutes: Math.max(15, Math.ceil(distanceKm * 3.5) + 15),
          pricingVersion: 'v1',
          bottleExchangeType: 'REFILL_EXCHANGE',
          bottleBrand: 'Sonangol',
          valveType: 'QUICK_20MM',
          deliveryNotes: `Pedido de teste #${i}`,
          items: {
            create: [{
              variantId: item.id,
              variantName: item.name,
              weightKg: item.weightKg,
              quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.unitPrice * quantity,
            }]
          },
          statusHistory: { create: { status: OrderStatus.AWAITING_SUPPLIER_ACCEPTANCE, note: 'Pedido criado e stock reservado.' } }
        },
        include: { items: true }
      });
      
      // Inventory movement record
      const invItem = await tx.inventoryItem.findUniqueOrThrow({
        where: { supplierId_variantId: { supplierId: demoSupplier.id, variantId: item.id } }
      });
      await tx.inventoryMovement.create({
        data: { inventoryId: invItem.id, orderId: newOrder.id, type: 'RESERVE', quantity, note: `Reserva do pedido ${reference}.` }
      });
      
      return newOrder;
    });
    
    createdOrders.push({ order, item, quantity, distanceKm, total });
    console.log(`  Order ${i}: ${order.reference} - ${item.name} x${quantity} - ${total} AOA - ${distanceKm}km`);
  }
  
  // 6. Move orders through supplier flow: ACCEPTED → PREPARING → READY_FOR_PICKUP
  console.log('\n--- Advancing orders through supplier flow ---');
  for (const { order } of createdOrders) {
    // Supplier accepts
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({ where: { id: order.id, status: OrderStatus.AWAITING_SUPPLIER_ACCEPTANCE }, data: { status: OrderStatus.SUPPLIER_ACCEPTED } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.SUPPLIER_ACCEPTED, note: 'Fornecedor aceitou o pedido.' } });
    });
    console.log(`  ${order.reference}: AWAITING_SUPPLIER_ACCEPTANCE → SUPPLIER_ACCEPTED`);
    
    // Supplier preparing
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({ where: { id: order.id, status: OrderStatus.SUPPLIER_ACCEPTED }, data: { status: OrderStatus.PREPARING } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.PREPARING, note: 'Fornecedor iniciou a preparação.' } });
    });
    console.log(`  ${order.reference}: SUPPLIER_ACCEPTED → PREPARING`);
    
    // Supplier ready
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({ where: { id: order.id, status: OrderStatus.PREPARING }, data: { status: OrderStatus.READY_FOR_PICKUP } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.READY_FOR_PICKUP, note: 'Pedido pronto para recolha.' } });
    });
    console.log(`  ${order.reference}: PREPARING → READY_FOR_PICKUP`);
  }
  
  // 7. Start dispatch for each order (this creates driver offers)
  console.log('\n--- Starting dispatch (creating driver offers) ---');
  for (const { order } of createdOrders) {
    // Move to DRIVER_SEARCHING
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({ where: { id: order.id, status: OrderStatus.READY_FOR_PICKUP }, data: { status: OrderStatus.DRIVER_SEARCHING } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.DRIVER_SEARCHING, note: 'Dispatch iniciado: procurando entregadores elegíveis.' } });
    });
    
    // Create driver offer for THIS driver (bypassing the candidate search)
    const offer = await prisma.driverOffer.create({
      data: {
        orderId: order.id,
        driverId: driverProfile.id,
        distanceToPickupKm: 0.5, // Very close since driver is at supplier
        estimatedPickupMinutes: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        status: DriverOfferStatus.PENDING,
      }
    });
    console.log(`  ${order.reference}: DRIVER_SEARCHING - Offer created for driver (offerId: ${offer.id})`);
  }
  
  // 8. Show the pending offers for this driver
  console.log('\n--- Pending offers for this driver ---');
  const offers = await prisma.driverOffer.findMany({
    where: { driverId: driverProfile.id, status: DriverOfferStatus.PENDING },
    include: { order: { include: { items: true, supplier: true } } }
  });
  
  offers.forEach(o => {
    console.log(`  Offer ${o.id}: Order ${o.order.reference} - ${o.order.items.map(i => `${i.variantName}x${i.quantity}`).join(', ')} - ${o.distanceToPickupKm}km pickup - Expires ${o.expiresAt}`);
  });
  
  console.log('\n=== DONE ===');
  console.log(`Driver ${driverProfile.fullName} (${driverUser.phone}) now has ${offers.length} pending offers.`);
  console.log('Driver can now:');
  console.log('  1. Call GET /drivers/me/offers (authenticated as driver) to see offers');
  console.log('  2. Call POST /drivers/me/offers/:offerId/accept to accept');
  console.log('  3. Order will move to DRIVER_ACCEPTED and delivery created');
  
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); });