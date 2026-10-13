import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { AdminService } from './application/admin.service';
import { AdminReviewRepositoryPort } from './domain/admin-review.repository';
import { PrismaAdminReviewRepository } from './infrastructure/prisma-admin-review.repository';
import { AuthModule } from '../auth/application/auth.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { DriverFinanceModule } from '../driver-finance/driver-finance.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [AuthModule, DispatchModule, DriverFinanceModule, MailModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: AdminReviewRepositoryPort, useClass: PrismaAdminReviewRepository },
  ],
})
export class AdminModule {}
