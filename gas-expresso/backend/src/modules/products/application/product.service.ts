import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto, UpdateVariantDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      include: { variants: { where: { active: true }, orderBy: { weightKg: 'asc' } } },
    });
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { variants: { orderBy: { weightKg: 'asc' } } } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          slug: dto.slug.trim().toLowerCase(), name: dto.name.trim(), description: dto.description?.trim() || null, active: dto.active ?? true,
          variants: { create: dto.variants.map((v) => ({ sku: v.sku.trim().toUpperCase(), name: v.name.trim(), weightKg: v.weightKg, unitPrice: v.unitPrice, cylinderPrice: v.cylinderPrice ?? 0, active: v.active ?? true })) },
        }, include: { variants: true },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('Slug ou SKU já está em uso.');
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.getById(id);
    return this.prisma.product.update({ where: { id }, data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
  }

  async updateVariant(id: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id } });
    if (!variant) throw new NotFoundException('Variação não encontrada.');
    return this.prisma.productVariant.update({ where: { id }, data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}), ...(dto.cylinderPrice !== undefined ? { cylinderPrice: dto.cylinderPrice } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) } });
  }
}
