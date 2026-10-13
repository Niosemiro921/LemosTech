import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryType, OrderStatus, ProductVariant, UserRole } from '@prisma/client';
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

type OrderQuote =
  | { available: false; message: string }
  | {
      available: true;
      supplier: CandidateSupplier;
      normalizedItems: Array<{ variantId: string; quantity: number }>;
      variants: Map<string, ProductVariant>;
      pricing: {
        subtotal: number;
        deliveryFee: number;
        platformFee: number;
        discount: 0;
        cylinderFee: number;
        total: number;
        currency: 'AOA';
        distanceKm: number;
        estimatedMinutes: number;
        pricingVersion: 'v1';
      };
    };

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(dto: QuoteOrderDto) {
    const result = await this.calculateQuote(dto);
    if (!result.available) return result;

    return {
      available: true,
      supplier: { id: result.supplier.id, tradeName: result.supplier.tradeName },
      pricing: result.pricing,
      payment: 'PAY_ON_DELIVERY',
    } as const;
  }

  private async calculateQuote(dto: QuoteOrderDto): Promise<OrderQuote> {
    const normalizedItems = this.normalizeItems(dto);
    const variants = await this.loadVariants(normalizedItems.map((item) => item.variantId));
    const candidate = this.findSupplier(normalizedItems, dto.latitude, dto.longitude, await this.loadCandidates());

    if (!candidate) {
      return { available: false, message: 'Não existe fornecedor ativo com stock suficiente nesta zona.' } as const;
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + variants.get(item.variantId)!.unitPrice * item.quantity, 0);
    // Cilindros novos são cobrados à parte; na troca e na recarga o cliente já é dono da botija.
    const cylinderFee = this.cylinderFee(normalizedItems, variants, dto.bottleExchangeType);
    const distanceKm = round2(this.haversine(dto.latitude, dto.longitude, candidate.latitude, candidate.longitude));
    const deliveryFee = this.deliveryFee(distanceKm, dto.deliveryType);
    const platformFee = Math.round(subtotal * this.platformCommissionRate());
    const estimatedMinutes = this.estimateMinutes(distanceKm, dto.deliveryType);

    return {
      available: true,
      supplier: candidate,
      normalizedItems,
      variants,
      pricing: {
        subtotal,
        deliveryFee,
        platformFee,
        discount: 0,
        cylinderFee,
        total: subtotal + cylinderFee + deliveryFee + platformFee,
        currency: 'AOA',
        distanceKm,
        estimatedMinutes,
        pricingVersion: 'v1',
      },
    } as const;
  }

  async create(customerId: string, dto: CreateOrderDto, idempotencyKey?: string) {
    const normalizedIdempotencyKey = idempotencyKey?.trim() || null;
    if (normalizedIdempotencyKey) {
      const existing = await this.prisma.order.findUnique({ where: { idempotencyKey: normalizedIdempotencyKey }, include: { items: true, supplier: true } });
      if (existing) {
        if (existing.customerId !== customerId) throw new ConflictException('Idempotency-Key já utilizado por outra conta.');
        return this.publicOrder(existing);
      }
    }
    if (dto.acceptEstimatedPrice === false) throw new BadRequestException('É necessário aceitar o preço estimado para criar o pedido.');
    const quote = await this.calculateQuote(dto);
    if (!quote.available) throw new ConflictException(quote.message);

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) throw new BadRequestException('A data programada deve estar no futuro.');

    const reference = `GE-${new Date().getUTCFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      return await this.prisma.$transaction(async (tx) => {
        for (const item of quote.normalizedItems) {
          const updated = await tx.inventoryItem.updateMany({
            where: {
              supplierId: quote.supplier.id,
              variantId: item.variantId,
              availableQty: { gte: item.quantity },
            },
            data: { availableQty: { decrement: item.quantity }, reservedQty: { increment: item.quantity } },
          });
          if (updated.count !== 1) throw new ConflictException('O stock foi alterado por outro pedido. Tente novamente.');
        }

        const order = await tx.order.create({
          data: {
            reference,
            idempotencyKey: normalizedIdempotencyKey,
            customerId,
            supplierId: quote.supplier.id,
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
            discount: quote.pricing.discount,
            cylinderFee: quote.pricing.cylinderFee,
            total: quote.pricing.total,
            distanceKm: quote.pricing.distanceKm,
            estimatedMinutes: quote.pricing.estimatedMinutes,
            pricingVersion: quote.pricing.pricingVersion,
            changeForAmount: dto.changeForAmount ?? null,
            bottleExchangeType: dto.bottleExchangeType?.trim() || 'REFILL_EXCHANGE',
            bottleBrand: dto.bottleBrand?.trim() || 'Sonangol',
            valveType: dto.valveType?.trim() || 'QUICK_20MM',
            deliveryNotes: dto.deliveryNotes?.trim() || null,
            items: {
              create: quote.normalizedItems.map((item) => {
                const variant = quote.variants.get(item.variantId)!;
                return {
                  variantId: variant.id,
                  variantName: variant.name,
                  weightKg: variant.weightKg,
                  quantity: item.quantity,
                  unitPrice: variant.unitPrice,
                  lineTotal: variant.unitPrice * item.quantity,
                };
              }),
            },
            statusHistory: { create: { status: OrderStatus.AWAITING_SUPPLIER_ACCEPTANCE, note: 'Pedido criado e stock reservado.' } },
          },
          include: { items: true, supplier: true },
        });
        await tx.notification.create({
          data: {
            userId: customerId,
            title: 'Pedido recebido',
            message: `O pedido ${order.reference} foi enviado para confirmação da empresa.`,
            type: 'ORDER',
          },
        });

        for (const item of quote.normalizedItems) {
          const inventory = await tx.inventoryItem.findUniqueOrThrow({
            where: { supplierId_variantId: { supplierId: quote.supplier.id, variantId: item.variantId } },
          });
          await tx.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              orderId: order.id,
              type: 'RESERVE',
              quantity: item.quantity,
              note: `Reserva do pedido ${order.reference}.`,
            },
          });
        }

        return this.publicOrder(order);
      });
    } catch (error) {
      if (normalizedIdempotencyKey && isUniqueConstraintError(error)) {
        const existing = await this.prisma.order.findUnique({
          where: { idempotencyKey: normalizedIdempotencyKey },
          include: { items: true, supplier: true },
        });
        if (existing) {
          if (existing.customerId !== customerId) throw new ConflictException('Idempotency-Key já utilizado por outra conta.');
          return this.publicOrder(existing);
        }
      }
      throw error;
    }
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
      const changed = await tx.order.updateMany({
        where: { id, supplierId: supplier.id, status: order.status },
        data: { status: OrderStatus.CANCELLED },
      });
      if (changed.count !== 1) throw new ConflictException('O estado do pedido mudou. Atualize e tente novamente.');
      for (const item of order.items) {
        const currentInventory = await tx.inventoryItem.findUnique({ where: { supplierId_variantId: { supplierId: supplier.id, variantId: item.variantId } } });
        if (!currentInventory || currentInventory.reservedQty < item.quantity) throw new ConflictException('A reserva de stock do pedido está inconsistente.');
        const inventory = await tx.inventoryItem.update({ where: { supplierId_variantId: { supplierId: supplier.id, variantId: item.variantId } }, data: { availableQty: { increment: item.quantity }, reservedQty: { decrement: item.quantity } } });
        await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, orderId: order.id, type: 'RELEASE', quantity: item.quantity, note: note.trim() } });
      }
      await tx.orderStatusHistory.create({ data: { orderId: id, status: OrderStatus.CANCELLED, note: note.trim() } });
      await tx.notification.create({
        data: {
          userId: order.customerId,
          title: 'Pedido cancelado',
          message: `O pedido ${order.reference} foi cancelado pela empresa.`,
          type: 'ORDER',
        },
      });
      return { id, reference: order.reference, status: OrderStatus.CANCELLED };
    });
  }

  private async supplierTransition(userId: string, id: string, to: OrderStatus, note: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, supplierId: supplier.id } });
      if (!order) throw new NotFoundException('Pedido não encontrado para este fornecedor.');
      assertTransition(order.status, to);
      const changed = await tx.order.updateMany({
        where: { id, supplierId: supplier.id, status: order.status },
        data: { status: to },
      });
      if (changed.count !== 1) throw new ConflictException('O estado do pedido mudou. Atualize e tente novamente.');
      await tx.orderStatusHistory.create({ data: { orderId: id, status: to, note } });
      await tx.notification.create({
        data: {
          userId: order.customerId,
          title: 'Estado do pedido atualizado',
          message: `O pedido ${order.reference} avançou para ${to}.`,
          type: 'ORDER',
        },
      });
      return { id: order.id, reference: order.reference, status: to };
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

  /** Total dos cilindros novos: só existe em pedidos de compra de botija (NEW_CYLINDER). */
  private cylinderFee(items: Array<{ variantId: string; quantity: number }>, variants: Map<string, ProductVariant>, exchangeType?: string) {
    if (exchangeType !== 'NEW_CYLINDER') return 0;
    return items.reduce((sum, item) => sum + (variants.get(item.variantId)?.cylinderPrice ?? 0) * item.quantity, 0);
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
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      deliveryType: order.deliveryType,
      paymentMethod: order.paymentMethod,
      changeForAmount: order.changeForAmount ?? null,
      bottleExchangeType: order.bottleExchangeType ?? 'REFILL_EXCHANGE',
      bottleBrand: order.bottleBrand ?? 'Sonangol',
      valveType: order.valveType ?? 'QUICK_20MM',
      deliveryNotes: order.deliveryNotes ?? null,
      deliveryAddress: order.deliveryAddress,
      latitude: order.latitude,
      longitude: order.longitude,
      scheduledAt: order.scheduledAt,
      pricing: {
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        platformFee: order.platformFee,
        discount: order.discount,
        cylinderFee: order.cylinderFee ?? 0,
        total: order.total,
        currency: order.currency,
        distanceKm: order.distanceKm,
        estimatedMinutes: order.estimatedMinutes,
        pricingVersion: order.pricingVersion,
      },
      supplier: order.supplier ? { id: order.supplier.id, tradeName: order.supplier.tradeName, latitude: order.supplier.latitude, longitude: order.supplier.longitude } : null,
      items: order.items ?? [],
      statusHistory: order.statusHistory ?? [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

function round2(value: number) { return Math.round(value * 100) / 100; }

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
