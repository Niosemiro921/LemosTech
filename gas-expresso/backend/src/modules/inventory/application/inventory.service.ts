import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSupplierInventory(userId: string) {
    const supplier = await this.supplier(userId);
    return this.prisma.inventoryItem.findMany({ where: { supplierId: supplier.id }, include: { variant: { include: { product: true } } }, orderBy: { updatedAt: 'desc' } });
  }

  async upsert(userId: string, variantId: string, availableQty: number, reorderLevel = 5, note?: string) {
    const supplier = await this.supplier(userId);
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variação de produto não encontrada.');
    if (!variant.active) throw new BadRequestException('Esta variação está inativa.');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.inventoryItem.findUnique({ where: { supplierId_variantId: { supplierId: supplier.id, variantId } } });
      const reserved = current?.reservedQty ?? 0;
      if (availableQty < reserved) throw new BadRequestException(`Stock disponível não pode ficar abaixo do stock reservado (${reserved}).`);
      const previous = current?.availableQty ?? 0;
      const item = await tx.inventoryItem.upsert({ where: { supplierId_variantId: { supplierId: supplier.id, variantId } }, create: { supplierId: supplier.id, variantId, availableQty, reorderLevel }, update: { availableQty, reorderLevel } });
      const delta = availableQty - previous;
      if (delta !== 0) await tx.inventoryMovement.create({ data: { inventoryId: item.id, type: 'ADJUSTMENT', quantity: delta, note: note?.trim() || `Ajuste de stock de ${previous} para ${availableQty}.` } });
      return item;
    });
  }

  async setLocation(userId: string, latitude: number, longitude: number) {
    const supplier = await this.supplier(userId);
    return this.prisma.supplierProfile.update({ where: { id: supplier.id }, data: { latitude, longitude }, select: { id: true, tradeName: true, latitude: true, longitude: true } });
  }

  private async supplier(userId: string) {
    const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!supplier) throw new NotFoundException('Perfil de fornecedor não encontrado.');
    return supplier;
  }
}
