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
    const [orders, inventory, lots, invoices, customers] = await Promise.all([
      this.prisma.order.findMany({ where: { supplierId: supplier.id }, select: { status: true, total: true, createdAt: true } }),
      this.prisma.inventoryItem.findMany({ where: { supplierId: supplier.id }, select: { availableQty: true, reservedQty: true, reorderLevel: true } }),
      this.prisma.supplierProductionLot.findMany({ where: { supplierId: supplier.id, status: { not: 'DISTRIBUTED' } }, select: { id: true } }),
      this.prisma.supplierInvoice.findMany({ where: { supplierId: supplier.id }, select: { type: true, status: true, amount: true } }),
      this.customerRows(supplier.id),
    ]);
    const lowStock = inventory.filter((row) => row.availableQty <= row.reorderLevel).length;
    const sales = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED').reduce((sum, o) => sum + o.total, 0);
    return { orders: orders.length, sales, lowStock, activeLots: lots.length, customers: customers.length, inventoryUnits: inventory.reduce((sum, r) => sum + r.availableQty + r.reservedQty, 0), pendingInvoices: invoices.filter((i) => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0), currency: 'AOA' };
  }

  async listLots(userId: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.supplierProductionLot.findMany({ where: { supplierId: supplier.id }, orderBy: { productionAt: 'desc' }, take: 500 });
  }

  async createLot(userId: string, dto: CreateLotDto) {
    const supplier = await this.getSupplier(userId);
    try { return await this.prisma.supplierProductionLot.create({ data: { supplierId: supplier.id, code: dto.code.trim(), productionAt: new Date(dto.productionAt), quantity: dto.quantity, status: dto.status, notes: dto.notes?.trim() || null } }); }
    catch (error) { if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('Já existe um lote com este código.'); throw error; }
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
    try { return await this.prisma.supplierInvoice.create({ data: { supplierId: supplier.id, number: dto.number.trim(), type: dto.type, amount: dto.amount, issueDate: new Date(dto.issueDate), dueDate: dto.dueDate ? new Date(dto.dueDate) : null, status: dto.status, description: dto.description?.trim() || null, paidAt: dto.status === 'PAID' ? new Date() : null } }); }
    catch (error) { if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('Já existe uma fatura com este número.'); throw error; }
  }

  async listCustomers(userId: string) {
    const supplier = await this.getSupplier(userId);
    return this.customerRows(supplier.id);
  }

  async listInteractions(userId: string, customerId?: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.supplierCustomerInteraction.findMany({ where: { supplierId: supplier.id, ...(customerId ? { customerId } : {}) }, include: { customer: { select: { id: true, phone: true, email: true, customer: { select: { fullName: true } } } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async createInteraction(userId: string, dto: CreateInteractionDto) {
    const supplier = await this.getSupplier(userId);
    const customer = await this.prisma.user.findFirst({ where: { id: dto.customerId, role: 'CUSTOMER' }, select: { id: true } });
    if (!customer) throw new BadRequestException('Cliente não encontrado.');
    return this.prisma.supplierCustomerInteraction.create({ data: { supplierId: supplier.id, customerId: dto.customerId, type: dto.type, subject: dto.subject.trim(), message: dto.message.trim(), nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null }, include: { customer: { select: { id: true, phone: true, customer: { select: { fullName: true } } } } } });
  }

  async segmentation(userId: string) {
    const customers = await this.listCustomers(userId);
    return customers.map((customer) => ({ ...customer, segment: customer.totalOrders >= 5 ? 'FREQUENT' : customer.lastOrderAt && (Date.now() - customer.lastOrderAt.getTime()) > 90 * 86400000 ? 'INACTIVE' : 'NEW' }));
  }

  async reports(userId: string) {
    const supplier = await this.getSupplier(userId);
    const orders = await this.prisma.order.findMany({ where: { supplierId: supplier.id }, select: { status: true, total: true, deliveryFee: true, createdAt: true } });
    const completed = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
    const byMonth = new Map<string, number>();
    for (const order of completed) { const key = order.createdAt.toISOString().slice(0, 7); byMonth.set(key, (byMonth.get(key) ?? 0) + order.total); }
    return { currency: 'AOA', totalOrders: orders.length, completedOrders: completed.length, grossSales: completed.reduce((s, o) => s + o.total, 0), deliveryFees: completed.reduce((s, o) => s + o.deliveryFee, 0), monthlySales: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })) };
  }

  private async customerRows(supplierId: string) {
    const orders = await this.prisma.order.findMany({ where: { supplierId }, select: { customerId: true, total: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
    const map = new Map<string, { customerId: string; totalOrders: number; totalSpent: number; lastOrderAt: Date | null }>();
    for (const order of orders) { const row = map.get(order.customerId) ?? { customerId: order.customerId, totalOrders: 0, totalSpent: 0, lastOrderAt: null }; row.totalOrders += 1; row.totalSpent += order.total; row.lastOrderAt ??= order.createdAt; map.set(order.customerId, row); }
    const ids = [...map.keys()];
    if (!ids.length) return [];
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, phone: true, email: true, customer: { select: { fullName: true } } } });
    const lookup = new Map(users.map((u) => [u.id, u]));
    return [...map.values()].map((row) => ({ customerId: row.customerId, name: lookup.get(row.customerId)?.customer?.fullName ?? lookup.get(row.customerId)?.phone ?? row.customerId, phone: lookup.get(row.customerId)?.phone ?? null, email: lookup.get(row.customerId)?.email ?? null, totalOrders: row.totalOrders, totalSpent: row.totalSpent, lastOrderAt: row.lastOrderAt, currency: 'AOA' }));
  }
}
