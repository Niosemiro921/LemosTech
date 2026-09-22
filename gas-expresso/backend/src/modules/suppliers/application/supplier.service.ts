import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SupplierRepositoryPort } from '../domain/supplier.repository';

@Injectable()
export class SupplierService extends SupplierRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: {
    userId: string;
    legalName: string;
    tradeName: string;
    nif: string;
    responsibleName: string;
  }): Promise<void> {
    await this.prisma.supplierProfile.create({ data: input });
  }
}
