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

  private map(user: User): UserRecord {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
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
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return user ? this.map(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.map(user) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
