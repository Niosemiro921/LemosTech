import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SupplierProfileInput, SupplierProfileUpdate, SupplierRepositoryPort } from '../domain/supplier.repository';

@Injectable()
export class SupplierService extends SupplierRepositoryPort {
  constructor(private readonly prisma: PrismaService) { super(); }

  async create(input: SupplierProfileInput): Promise<void> {
    await this.prisma.supplierProfile.create({ data: input });
  }

  async getByUserId(userId: string) {
    const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId }, include: { user: { select: { status: true, phone: true, email: true } } } });
    if (!supplier) throw new NotFoundException('Perfil de empresa não encontrado.');
    return supplier;
  }

  async updateByUserId(userId: string, input: SupplierProfileUpdate) {
    await this.getByUserId(userId);
    return this.prisma.supplierProfile.update({ where: { userId }, data: input });
  }
}
