import { Module } from '@nestjs/common';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { UserRepositoryPort } from './domain/user.repository';

@Module({
  providers: [{ provide: UserRepositoryPort, useClass: PrismaUserRepository }],
  exports: [UserRepositoryPort],
})
export class UsersModule {}
