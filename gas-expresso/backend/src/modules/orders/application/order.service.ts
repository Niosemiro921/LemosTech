import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryType, OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { QuoteOrderDto } from '../dto/quote-order.dto';
import { assertTransition } from '../domain/order-status';

interface CandidateSupplier {
  id: string;
  tradeName: string;
  latitude: number;
  longitude: number;
  inventory: Array<{ variantId: string; availableQty: number }>;
}

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(dto: QuoteOrderDto) {
    const normalizedItems = this.normalizeItems(dto);
    const variants = await this.loadVariants(normalizedItems.map((item) => item.variantId));
    const candidate = this.findSupplier(normalizedItems, dto.latitude, dto.longitude, await this.loadCandidates());

    if (!candidate) {
      return { available: false, message: 'Não existe fornecedor ativo com stock suficiente nesta zona.' } as const;
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + variants.get(item.variantId)!.unitPrice * item.quantity, 0);
    const distanceKm = round2(this.haversine(dto.latitude, dto.longitude, candidate.latitude, candidate.longitude));
    const deliveryFee = this.deliveryFee(distanceKm, dto.deliveryType);
    const platformFee = Math.round(subtotal * this.platformCommissionRate());
    const estimatedMinutes = this.estimateMinutes(distanceKm, dto.deliveryType);

    return {
      available: true,
      supplier: { id: candidate.id, tradeName: candidate.tradeName },
      pricing: { subtotal, deliveryFee, platformFee, discount: 0, total: subtotal + deliveryFee + platformFee, currency: 'AOA', distanceKm, estimatedMinutes, pricingVersion: 'v1' },
      payment: 'PAY_ON_DELIVERY',
    } as const;
  }

  async create(customerId: string, dto: CreateOrderDto, idempotencyKey?: string) {
    if (idempotencyKey?.trim()) {
      const existing = await this.prisma.order.findUnique({ where: { idempotencyKey: idempotencyKey.trim() }, include: { items: true, supplier: true } });
      if (existing) {
        if (existing.customerId !== customerId) throw new ConflictException('Idempotency-Key já utilizado por outra conta.');
        return this.publicOrder(existing);
      }
    }
    if (dto.acceptEstimatedPrice === false) throw new BadRequestException('É necessário aceitar o preço estimado para criar o pedido.');
    const quote = await this.quote(dto);
    if (!quote.available) throw new ConflictException(quote.message);

    const normalizedItems = this.normalizeItems(dto);
    const variants = await this.loadVariants(normalizedItems.map((item) => item.variantId));
    const supplier = this.findSupplier(normalizedItems, dto.latitude, dto.longitude, await this.loadCandidates());
    if (!supplier) throw new ConflictException('O stock disponível mudou. Tente novamente.');

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) throw new BadRequestException('A data programada deve estar no futuro.');

    const reference = `GE-${new Date().getUTCFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return this.prisma.$transaction(async (tx) => {
      for (const item of normalizedItems) {
        const updated = await tx.inventoryItem.updateMany({
          where: { supplierId: supplier.id, variantId: item.variantId, availableQty: { gte: item.quantity } },
          data: { availableQty: { decrement: item.quantity }, reservedQty: { increment: item.quantity } },
        });
        if (updated.count !== 1) throw new ConflictException('O stock foi alterado por outro pedido. Tente novamente.');
      }

      const order = await tx.order.create({
        data: {
          reference,
          idempotencyKey: idempotencyKey?.trim() || null,
          customerId,
          supplierId: supplier.id,
          status: OrderStatus.AWAITING_SUPPLIER_ACCEPTANCE,
          deliveryType: dto.deliveryType,
          paymentMethod: 'PAY_ON_DELIVERY',
          scheduledAt,
          deliveryAddress: dto.deliveryAddress.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          subtotal: quote.pricing.subtotal,
          deliveryFee: quote.pricing.deliveryFee,
          platformFee: quote.pricing.platformFee,
          discount: 0,
          total: quote.pricing.total,
          distanceKm: quote.pricing.distanceKm,
          estimatedMinutes: quote.pricing.estimatedMinutes,
          pricingVersion: quote.pricing.pricingVersion,
          items: { create: normalizedItems.map((item) => {
            const variant = variants.get(item.variantId)!;
            return { variantId: variant.id, variantName: variant.name, weightKg: variant.weightKg, quantity: item.quantity, unitPrice: variant.unitPrice, lineTotal: variant.unitPrice * item.quantity };
          }) },
          statusHistory: { create: { status: OrderStatus.AWAITING_SUPPLIER_ACCEPTANCE, note: 'Pedido criado e stock reservado.' } },
        },
        include: { items: true, supplier: true },
      });

      for (const item of normalizedItems) {
        const inventory = await tx.inventoryItem.findUniqueOrThrow({ where: { supplierId_variantId: { supplierId: supplier.id, variantId: item.variantId } } });
        await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, orderId: order.id, type: 'RESERVE', quantity: item.quantity, note: `Reserva do pedido ${order.reference}.` } });
      }

      return this.publicOrder(order);
    });
  }

  async listCustomerOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, include: { items: true, supplier: true } });
    return orders.map((order) => this.publicOrder(order));
  }

  async getCustomerOrder(customerId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, customerId }, include: { items: true, supplier: true, statusHistory: { orderBy: { createdAt: 'asc' } } } });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return this.publicOrder(order);
  }

  async listSupplierOrders(userId: string, status?: OrderStatus) {
    const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    const orders = await this.prisma.order.findMany({ where: { supplierId: supplier.id, ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' }, include: { items: true, customer: { select: { id: true, phone: true, customer: { select: { fullName: true } } } } } });
    return orders.map((order) => this.publicOrder(order));
  }

  async supplierAccept(userId: string, id: string) { return this.supplierTransition(userId, id, OrderStatus.SUPPLIER_ACCEPTED, 'Fornecedor aceitou o pedido.'); }
  async supplierPreparing(userId: string, id: string) { return this.supplierTransition(userId, id, OrderStatus.PREPARING, 'Fornecedor iniciou a preparação.'); }
  async supplierReady(userId: string, id: string) { return this.supplierTransition(userId, id, OrderStatus.READY_FOR_PICKUP, 'Pedido pronto para recolha.'); }

  async supplierCancel(userId: string, id: string, note: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, supplierId: supplier.id }, include: { items: true } });
      if (!order) throw new NotFoundException('Pedido não encontrado para este fornecedor.');
      assertTransition(order.status, OrderStatus.CANCELLED);
      for (const item of order.items) {
        const currentInventory = await tx.inventoryItem.findUnique({ where: { supplierId_variantId: { supplierId: supplier.id, variantId: item.variantId } } });
        if (!currentInventory || currentInventory.reservedQty < item.quantity) throw new ConflictException('A reserva de stock do pedido está inconsistente.');
        const inventory = await tx.inventoryItem.update({ where: { supplierId_variantId: { supplierId: supplier.id, variantId: item.variantId } }, data: { availableQty: { increment: item.quantity }, reservedQty: { decrement: item.quantity } } });
        await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, orderId: order.id, type: 'RELEASE', quantity: item.quantity, note: note.trim() } });
      }
      await tx.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: OrderStatus.CANCELLED, note: note.trim() } });
      return { id, reference: order.reference, status: OrderStatus.CANCELLED };
    });
  }

  private async supplierTransition(userId: string, id: string, to: OrderStatus, note: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, supplierId: supplier.id } });
      if (!order) throw new NotFoundException('Pedido não encontrado para este fornecedor.');
      assertTransition(order.status, to);
      const updated = await tx.order.update({ where: { id }, data: { status: to } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: to, note } });
      return { id: updated.id, reference: updated.reference, status: updated.status };
    });
  }

  private async getSupplier(userId: string) {
    const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    return supplier;
  }

  private async loadVariants(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) throw new BadRequestException('O pedido precisa de pelo menos um item.');
    const variants = await this.prisma.productVariant.findMany({ where: { id: { in: uniqueIds }, active: true } });
    if (variants.length !== uniqueIds.length) throw new BadRequestException('Um ou mais produtos selecionados não estão disponíveis.');
    return new Map(variants.map((variant) => [variant.id, variant]));
  }

  private async loadCandidates(): Promise<CandidateSupplier[]> {
    const suppliers = await this.prisma.supplierProfile.findMany({ where: { latitude: { not: null }, longitude: { not: null }, user: { role: UserRole.SUPPLIER, status: 'ACTIVE' } }, select: { id: true, tradeName: true, latitude: true, longitude: true, inventory: { select: { variantId: true, availableQty: true } } } });
    return suppliers.filter((s): s is CandidateSupplier => s.latitude !== null && s.longitude !== null);
  }

  private findSupplier(items: Array<{ variantId: string; quantity: number }>, latitude: number, longitude: number, candidates: CandidateSupplier[]) {
    return [...candidates].filter((supplier) => items.every((item) => (supplier.inventory.find((row) => row.variantId === item.variantId)?.availableQty ?? 0) >= item.quantity)).map((supplier) => ({ ...supplier, distance: this.haversine(latitude, longitude, supplier.latitude, supplier.longitude) })).sort((a, b) => a.distance - b.distance)[0] ?? null;
  }

  private normalizeItems(dto: QuoteOrderDto) {
    const totals = new Map<string, number>();
    for (const item of dto.items) totals.set(item.variantId, (totals.get(item.variantId) ?? 0) + item.quantity);
    return [...totals.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
  }

  private deliveryFee(distanceKm: number, type: DeliveryType) {
    const base = type === DeliveryType.EXPRESS ? 1500 : 1100;
    const perKm = type === DeliveryType.EXPRESS ? 180 : 130;
    return Math.round(base + distanceKm * perKm);
  }

  private estimateMinutes(distanceKm: number, type: DeliveryType) {
    const base = type === DeliveryType.EXPRESS ? 15 : 30;
    return Math.max(base, Math.ceil(distanceKm * (type === DeliveryType.EXPRESS ? 3.5 : 5)) + base);
  }

  private platformCommissionRate() {
    const rate = Number(process.env.PLATFORM_COMMISSION_RATE ?? '0.08');
    return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.08;
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const rad = (v: number) => (v * Math.PI) / 180;
    const dLat = rad(lat2 - lat1); const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  }

  private publicOrder(order: any) {
    return { id: order.id, reference: order.reference, status: order.status, deliveryType: order.deliveryType, paymentMethod: order.paymentMethod, deliveryAddress: order.deliveryAddress, latitude: order.latitude, longitude: order.longitude, scheduledAt: order.scheduledAt, pricing: { subtotal: order.subtotal, deliveryFee: order.deliveryFee, platformFee: order.platformFee, discount: order.discount, total: order.total, currency: order.currency, distanceKm: order.distanceKm, estimatedMinutes: order.estimatedMinutes, pricingVersion: order.pricingVersion }, supplier: order.supplier ? { id: order.supplier.id, tradeName: order.supplier.tradeName, latitude: order.supplier.latitude, longitude: order.supplier.longitude } : null, items: order.items ?? [], statusHistory: order.statusHistory ?? [], createdAt: order.createdAt, updatedAt: order.updatedAt };
  }
}

function round2(value: number) { return Math.round(value * 100) / 100; }
