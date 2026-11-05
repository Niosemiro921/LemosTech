import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateInteractionDto, CreateInvoiceDto, CreateLotDto, UpdateLotDto } from '../dto/supplier-business.dto';

@Injectable()
export class SupplierBusinessService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSupplier(userId: string) {
    const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!supplier) throw new NotFoundException('Perfil de fornecedor não encontrado.');
    return supplier;
  }

  async getDashboard(userId: string) {
    const supplier = await this.getSupplier(userId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { supplierId: supplier.id },
      select: { id: true, reference: true, status: true, subtotal: true, deliveryFee: true, platformFee: true, discount: true, cylinderFee: true, total: true, createdAt: true, customerId: true, deliveryType: true, paymentMethod: true },
      orderBy: { createdAt: 'desc' },
    });

    const deliveredStatuses = ['DELIVERED', 'COMPLETED'];
    const deliveredOrders = orders.filter((o) => deliveredStatuses.includes(o.status));
    const activeOrders = orders.filter((o) => !['CANCELLED', 'FAILED'].includes(o.status));

    const sum = (rows: Array<{ subtotal?: number | null; total?: number | null }>) => rows.reduce((s, o) => s + (o.subtotal ?? 0), 0);

    const salesTotal = deliveredOrders.reduce((s, o) => s + (o.subtotal ?? 0), 0);
    const salesToday = deliveredOrders.filter((o) => (o.createdAt ?? new Date(0)) >= startOfDay).reduce((s, o) => s + (o.subtotal ?? 0), 0);
    const salesWeek = deliveredOrders.filter((o) => (o.createdAt ?? new Date(0)) >= startOfWeek).reduce((s, o) => s + (o.subtotal ?? 0), 0);
    const salesMonth = deliveredOrders.filter((o) => (o.createdAt ?? new Date(0)) >= startOfMonth).reduce((s, o) => s + (o.subtotal ?? 0), 0);

    const ordersReceived = orders.length;
    const ordersPending = orders.filter((o) => ['AWAITING_SUPPLIER_ACCEPTANCE', 'SUPPLIER_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(o.status)).length;
    const ordersPreparing = orders.filter((o) => ['PREPARING', 'READY_FOR_PICKUP'].includes(o.status)).length;
    const ordersInDelivery = orders.filter((o) => ['DRIVER_SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(o.status)).length;
    const ordersDelivered = deliveredOrders.length;
    const ordersCancelled = orders.filter((o) => o.status === 'CANCELLED').length;

    const paidInvoices = await this.prisma.supplierInvoice.findMany({ where: { supplierId: supplier.id, status: 'PAID', type: 'SALE' }, select: { amount: true, paidAt: true, issueDate: true } });
    const revenueReceived = paidInvoices.reduce((s, i) => s + i.amount, 0);
    const amountsToReceive = paidInvoices.length;

    const openInvoices = await this.prisma.supplierInvoice.findMany({ where: { supplierId: supplier.id, status: 'PENDING', type: 'SALE' }, select: { amount: true, issueDate: true, dueDate: true } });

    const expensesRows = await this.prisma.supplierInvoice.findMany({ where: { supplierId: supplier.id, status: 'PENDING', type: 'PURCHASE' }, select: { amount: true, issueDate: true, dueDate: true } });
    const expenses = expensesRows.reduce((s, i) => s + i.amount, 0);

    const inventory = await this.prisma.inventoryItem.findMany({ where: { supplierId: supplier.id }, select: { availableQty: true, reservedQty: true, reorderLevel: true, variantId: true } });
    const bottlesAvailable = inventory.reduce((s, i) => s + i.availableQty, 0);
    const bottlesReserved = inventory.reduce((s, i) => s + i.reservedQty, 0);
    const lowStockProducts = inventory.filter((i) => i.availableQty <= i.reorderLevel).length;
    const outOfStockProducts = inventory.filter((i) => i.availableQty <= 0).length;

    const lowStock = lowStockProducts;
    const sales = salesTotal;
    const inventoryUnits = inventory.reduce((s, i) => s + i.availableQty + i.reservedQty, 0);

    const lowStockList = inventory.filter((i) => i.availableQty <= i.reorderLevel).slice(0, 20);
    const deliveryIds = await this.prisma.delivery.findMany({ where: { order: { supplierId: supplier.id } }, select: { id: true, status: true, createdAt: true, deliveredAt: true } });
    const delayedDeliveries = deliveryIds.filter((d) => ['ASSIGNED', 'TO_PICKUP', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(d.status) && d.deliveredAt && d.deliveredAt.getTime() < Date.now() - 48 * 3600000).length;

    const salesByDay = await this.buildSalesByDay(supplier.id);
    const salesByMonth = await this.buildSalesByMonth(supplier.id);

    return {
      currency: 'AOA' as const,
      generatedAt: now.toISOString(),
      orders: orders.length,
      sales: salesTotal,
      inventoryUnits,
      lowStock,
      pendingInvoices: openInvoices.reduce((s, i) => s + i.amount, 0),
      customers: 0,
      activeLots: 0,
      kpis: {
        salesToday,
        salesWeek,
        salesMonth,
        totalSales: salesTotal,
        ordersReceived: ordersReceived,
        ordersPending,
        ordersPreparing,
        ordersInDelivery,
        ordersDelivered,
        ordersCancelled,
        revenueReceived,
        amountsToReceive: openInvoices.length,
        amountsToReceiveValue: openInvoices.reduce((s, i) => s + i.amount, 0),
        expenses,
        grossMarginEstimated: salesTotal > 0 ? Number((salesTotal * 0.35).toFixed(2)) : 0,
        grossMarginEstimatedAvailable: salesTotal > 0,
        bottlesAvailable,
        bottlesReserved,
        bottlesDelivered: deliveredOrders.length,
        bottlesEmpty: 0,
        lowStockProducts,
        outOfStockProducts,
        pendingPurchases: 0,
        delayedDeliveries,
        employeePerformance: [] as Array<Record<string, unknown>>,
      },
      salesSeries: salesByDay,
      salesByMonth,
      ordersByStatus: await this.buildOrdersByStatus(orders),
      expensesVsRevenue: await this.buildExpensesVsRevenue(supplier.id),
      periodComparison: await this.buildPeriodComparison(supplier.id),
    };
  }

  private async buildSalesByDay(supplierId: string, days = 14) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const rows = await this.prisma.order.findMany({ where: { supplierId, createdAt: { gte: start, lte: now } }, select: { createdAt: true, subtotal: true, status: true } });
    const map = new Map<string, { sales: number; orders: number }>();
    for (const order of rows) {
      if (order.status === 'CANCELLED') continue;
      const key = order.createdAt.toISOString().slice(0, 10);
      const row = map.get(key) ?? { sales: 0, orders: 0 };
      row.sales += order.subtotal ?? 0;
      row.orders += 1;
      map.set(key, row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, sales: value.sales, orders: value.orders }));
  }

  private async buildSalesByMonth(supplierId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
    const rows = await this.prisma.order.findMany({ where: { supplierId, createdAt: { gte: start, lte: now } }, select: { createdAt: true, subtotal: true, status: true } });
    const map = new Map<string, number>();
    for (const order of rows) {
      if (order.status === 'CANCELLED') continue;
      const key = order.createdAt.toISOString().slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + (order.subtotal ?? 0));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }));
  }

  private async buildOrdersByStatus(orders: Array<{ status: string; subtotal?: number | null; total?: number | null }>) {
    const order = ['CREATED', 'AWAITING_SUPPLIER_ACCEPTANCE', 'SUPPLIER_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'];
    const counts = new Map<string, { count: number; total: number }>();
    for (const row of orders) {
      const entry = counts.get(row.status) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += row.subtotal ?? 0;
      counts.set(row.status, entry);
    }
    return [...order].map((status) => ({ status, ...(counts.get(status) ?? { count: 0, total: 0 }) })).filter((row) => row.count > 0);
  }

  private async buildExpensesVsRevenue(supplierId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthOrders = await this.prisma.order.findMany({ where: { supplierId, createdAt: { gte: startOfMonth, lte: now }, status: { not: 'CANCELLED' } }, select: { subtotal: true, status: true } });
    const revenue = monthOrders.reduce((s, o) => s + (o.subtotal ?? 0), 0);
    const expenses = (await this.prisma.supplierInvoice.findMany({ where: { supplierId, status: 'PENDING', type: 'PURCHASE', issueDate: { gte: startOfMonth } }, select: { amount: true } })).reduce((s, i) => s + i.amount, 0);
    return [{ period: now.toISOString().slice(0, 7), revenue, expenses }];
  }

  private async buildPeriodComparison(supplierId: string) {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const currentRows = await this.prisma.order.findMany({ where: { supplierId, createdAt: { gte: currentStart, lte: now }, status: { not: 'CANCELLED' } }, select: { subtotal: true } });
    const previousRows = await this.prisma.order.findMany({ where: { supplierId, createdAt: { gte: previousStart, lte: previousEnd }, status: { not: 'CANCELLED' } }, select: { subtotal: true } });
    const sum = (rows: Array<{ subtotal?: number | null }>) => rows.reduce((s, o) => s + (o.subtotal ?? 0), 0);
    const current = sum(currentRows);
    const previous = sum(previousRows);
    const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return { current, previous, growth };
  }

  async listLots(userId: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.supplierProductionLot.findMany({ where: { supplierId: supplier.id }, orderBy: { productionAt: 'desc' }, take: 500 });
  }

  async createLot(userId: string, dto: CreateLotDto) {
    const supplier = await this.getSupplier(userId);
    try {
      return await this.prisma.supplierProductionLot.create({ data: { supplierId: supplier.id, code: dto.code.trim(), productionAt: new Date(dto.productionAt), quantity: dto.quantity, status: dto.status, notes: dto.notes?.trim() || null } });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('Já existe um lote com este código.');
      throw error;
    }
  }

  async updateLot(userId: string, id: string, dto: UpdateLotDto) {
    const supplier = await this.getSupplier(userId);
    const lot = await this.prisma.supplierProductionLot.findFirst({ where: { id, supplierId: supplier.id } });
    if (!lot) throw new NotFoundException('Lote não encontrado.');
    return this.prisma.supplierProductionLot.update({ where: { id }, data: { ...(dto.productionAt ? { productionAt: new Date(dto.productionAt) } : {}), ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}), ...(dto.status !== undefined ? { status: dto.status } : {}), ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}) } });
  }

  async listInvoices(userId: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.supplierInvoice.findMany({ where: { supplierId: supplier.id }, orderBy: { issueDate: 'desc' }, take: 500 });
  }

  async createInvoice(userId: string, dto: CreateInvoiceDto) {
    const supplier = await this.getSupplier(userId);
    try {
      return await this.prisma.supplierInvoice.create({ data: { supplierId: supplier.id, number: dto.number.trim(), type: dto.type, amount: dto.amount, issueDate: new Date(dto.issueDate), dueDate: dto.dueDate ? new Date(dto.dueDate) : null, status: dto.status, description: dto.description?.trim() || null, paidAt: dto.status === 'PAID' ? new Date() : null } });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('Já existe uma fatura com este número.');
      throw error;
    }
  }

  async listCustomers(userId: string) {
    const supplier = await this.getSupplier(userId);
    const orders = await this.prisma.order.findMany({ where: { supplierId: supplier.id }, select: { customerId: true, total: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
    const map = new Map<string, { customerId: string; totalOrders: number; totalSpent: number; lastOrderAt: Date | null }>();
    for (const order of orders) { const row = map.get(order.customerId) ?? { customerId: order.customerId, totalOrders: 0, totalSpent: 0, lastOrderAt: null }; row.totalOrders += 1; row.totalSpent += order.total ?? 0; row.lastOrderAt ??= order.createdAt; map.set(order.customerId, row); }
    const ids = [...map.keys()];
    if (!ids.length) return [];
    const users = await this.prisma.user.findMany({ where: { id: { in: ids }, role: 'CUSTOMER' }, select: { id: true, phone: true, email: true, customer: { select: { fullName: true } } } });
    const lookup = new Map(users.map((u) => [u.id, u]));
    return [...map.values()].map((row) => ({ customerId: row.customerId, name: lookup.get(row.customerId)?.customer?.fullName ?? lookup.get(row.customerId)?.phone ?? row.customerId, phone: lookup.get(row.customerId)?.phone ?? null, email: lookup.get(row.customerId)?.email ?? null, totalOrders: row.totalOrders, totalSpent: row.totalSpent, lastOrderAt: row.lastOrderAt, currency: 'AOA' }));
  }

  async listInteractions(userId: string, customerId?: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.supplierCustomerInteraction.findMany({ where: { supplierId: supplier.id, ...(customerId ? { customerId } : {}) }, include: { customer: { select: { id: true, phone: true, email: true, customer: { select: { fullName: true } } } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async createInteraction(userId: string, dto: CreateInteractionDto) {
    const supplier = await this.getSupplier(userId);
    const customer = await this.prisma.user.findFirst({ where: { id: dto.customerId, role: 'CUSTOMER' }, select: { id: true } });
    if (!customer) throw new BadRequestException('Cliente não encontrado.');
    return this.prisma.supplierCustomerInteraction.create({ data: { supplierId: supplier.id, customerId: dto.customerId, type: dto.type, subject: dto.subject.trim(), message: dto.message.trim(), nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null }, include: { customer: { select: { id: true, phone: true, email: true, customer: { select: { fullName: true } } } } } });
  }

  async segmentation(userId: string) {
    const customers = await this.listCustomers(userId);
    return customers.map((customer) => ({ ...customer, segment: customer.totalOrders >= 5 ? 'FREQUENT' : customer.lastOrderAt && (Date.now() - customer.lastOrderAt.getTime()) > 90 * 86400000 ? 'INACTIVE' : 'NEW' }));
  }

  async payments(userId: string) {
    const supplier = await this.getSupplier(userId);
    const invoices = await this.prisma.supplierInvoice.findMany({ where: { supplierId: supplier.id, status: 'PAID', type: 'SALE' }, orderBy: { issueDate: 'desc' }, take: 50, select: { id: true, number: true, amount: true, issueDate: true, status: true, description: true } });
    return { currency: 'AOA', items: invoices.map((i) => ({ id: i.id, reference: i.number, amount: i.amount, date: i.issueDate, status: i.status, description: i.description })), total: invoices.reduce((s, i) => s + i.amount, 0) };
  }

  async expenses(userId: string) {
    const supplier = await this.getSupplier(userId);
    const invoices = await this.prisma.supplierInvoice.findMany({ where: { supplierId: supplier.id, status: 'PENDING', type: 'PURCHASE' }, orderBy: { issueDate: 'desc' }, take: 50, select: { id: true, number: true, amount: true, issueDate: true, status: true, description: true } });
    return { currency: 'AOA', items: invoices.map((i) => ({ id: i.id, reference: i.number, amount: i.amount, date: i.issueDate, status: i.status, description: i.description })), total: invoices.reduce((s, i) => s + i.amount, 0) };
  }

  async reports(userId: string) {
    const supplier = await this.getSupplier(userId);
    const orders = await this.prisma.order.findMany({ where: { supplierId: supplier.id }, select: { status: true, total: true, deliveryFee: true, createdAt: true } });
    const completed = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
    const byMonth = new Map<string, number>();
    for (const order of completed) { const key = order.createdAt.toISOString().slice(0, 7); byMonth.set(key, (byMonth.get(key) ?? 0) + order.total); }
    return { currency: 'AOA', totalOrders: orders.length, completedOrders: completed.length, grossSales: completed.reduce((s, o) => s + o.total, 0), deliveryFees: completed.reduce((s, o) => s + o.deliveryFee, 0), monthlySales: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })) };
  }
}
