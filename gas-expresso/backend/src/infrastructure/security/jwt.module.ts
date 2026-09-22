import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Global()
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
  exports: [JwtModule],
})
export class JwtInfrastructureModule {}