import { Module } from '@nestjs/common';
import { SecurityModule } from '../../infrastructure/security/security.module';
import { UsersInfrastructureModule } from './infrastructure/users.module';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [
    SecurityModule,
    UsersInfrastructureModule,
  ],
  controllers: [UsersController],
  exports: [UsersInfrastructureModule],
})
export class UsersModule {}
