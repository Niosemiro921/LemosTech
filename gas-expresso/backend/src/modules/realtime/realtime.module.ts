import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthModule } from '../../modules/auth/application/auth.module'; // <-- Caminho hipotético do seu AuthModule
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

@Module({ 
  imports: [
    DatabaseModule,
    AuthModule // <-- Importando o AuthModule, ele injeta o JwtService configurado automaticamente
  ], 
  controllers: [RealtimeController], 
  providers: [RealtimeService], 
  exports: [RealtimeService] 
})
export class RealtimeModule {}
