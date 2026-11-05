import { Module } from '@nestjs/common';
import { WalletController } from './presentation/wallet.controller';

@Module({
  controllers: [WalletController],
})
export class WalletsModule {}