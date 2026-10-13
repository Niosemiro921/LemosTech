import { Injectable } from '@nestjs/common';
import { Prisma, User, UserRole, AccountStatus as PrismaAccountStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountStatus, Role } from '../../../shared/domain/auth.enums';
import { CreateUserInput, UserRecord, UserRepositoryPort } from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository extends UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private map(user: User & { customer?: { fullName: string } | null; driver?: { fullName: string } | null; supplier?: { tradeName: string } | null }): UserRecord {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.customer?.fullName ?? user.driver?.fullName ?? user.supplier?.tradeName ?? user.name ?? null,
      passwordHash: user.passwordHash,
      role: user.role as Role,
      status: user.status as AccountStatus,
      reviewedAt: user.reviewedAt,
      reviewNote: user.reviewNote,
    };
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const data: Prisma.UserCreateInput = {
      phone: input.phone,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role as UserRole,
      status: input.status as PrismaAccountStatus,
    };
    return this.map(await this.prisma.user.create({ data }));
  }

  async findByPhone(phone: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: { phone },
      orderBy: { createdAt: 'asc' },
      include: { customer: true, driver: true, supplier: true },
    });
    return user ? this.map(user) : null;
  }

  async findByPhoneAndRole(phone: string, role: Role): Promise<UserRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: { phone, role: role as UserRole },
      include: { customer: true, driver: true, supplier: true },
    });
    return user ? this.map(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { customer: true, driver: true, supplier: true } });
    return user ? this.map(user) : null;
  }

  async updateCustomerProfile(id: string, input: { fullName?: string; email?: string | null }): Promise<UserRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (input.fullName !== undefined) {
        await tx.customerProfile.update({ where: { userId: id }, data: { fullName: input.fullName } });
      }
      const user = await tx.user.update({
        where: { id },
        data: input.email === undefined ? {} : { email: input.email },
        include: { customer: true, driver: true, supplier: true },
      });
      return this.map(user);
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
