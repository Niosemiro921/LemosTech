import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DriverRepositoryPort } from '../domain/driver.repository';

@Injectable()
export class DriverService extends DriverRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: { userId: string; fullName: string; documentNumber: string; vehicleType: string }): Promise<void> {
    await this.prisma.driverProfile.create({ data: input });
  }
}
