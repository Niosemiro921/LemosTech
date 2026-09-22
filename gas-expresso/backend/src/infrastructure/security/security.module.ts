import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwtSecret'),
        signOptions: {
          expiresIn: config.get<string>('jwtExpiresIn') as any,
        },
      }),
    }),
  ],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class SecurityModule {}
