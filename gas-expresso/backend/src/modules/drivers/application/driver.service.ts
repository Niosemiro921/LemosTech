import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DriverProfileInput, DriverProfileUpdate, DriverRepositoryPort } from '../domain/driver.repository';

@Injectable()
export class DriverService extends DriverRepositoryPort {
  constructor(private readonly prisma: PrismaService) { super(); }

  async create(input: DriverProfileInput): Promise<void> {
    await this.prisma.driverProfile.create({ data: input });
  }

  async getByUserId(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { user: { select: { role: true, status: true, phone: true, email: true } } },
    });
    if (!driver) throw new NotFoundException('Perfil profissional não encontrado.');
    const completedDeliveries = await this.prisma.delivery.count({ where: { driverId: driver.id, status: 'DELIVERED' } });
    return { ...driver, completedDeliveries };
  }

  async updateByUserId(userId: string, input: DriverProfileUpdate) {
    await this.getByUserId(userId);
    return this.prisma.driverProfile.update({
      where: { userId },
      data: {
        ...input,
        ...(input.fullName === undefined ? {} : { fullName: input.fullName.trim() }),
        ...(input.documentNumber === undefined ? {} : { documentNumber: input.documentNumber.trim() }),
        ...(input.vehicleType === undefined ? {} : { vehicleType: input.vehicleType.trim() }),
      },
    });
  }
}
