import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CustomerRepositoryPort } from '../domain/customer.repository';

@Injectable()
export class CustomerService extends CustomerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: { userId: string; fullName: string }): Promise<void> {
    await this.prisma.customerProfile.create({ data: input });
  }
}
