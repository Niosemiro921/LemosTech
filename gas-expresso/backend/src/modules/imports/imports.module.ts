import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthModule } from '../auth/application/auth.module';
import { ImportsService } from './application/imports.service';
import { ImportsController } from './presentation/imports.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
