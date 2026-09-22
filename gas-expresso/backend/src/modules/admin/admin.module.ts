import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { AdminService } from './application/admin.service';
import { AdminReviewRepositoryPort } from './domain/admin-review.repository';
import { PrismaAdminReviewRepository } from './infrastructure/prisma-admin-review.repository';
import { AuthModule } from '../auth/application/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: AdminReviewRepositoryPort, useClass: PrismaAdminReviewRepository },
  ],
})
export class AdminModule {}
