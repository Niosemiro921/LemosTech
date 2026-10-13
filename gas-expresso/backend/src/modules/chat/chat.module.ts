import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChatService } from './application/chat.service';
import { ChatController } from './presentation/chat.controller';

@Module({ imports: [DatabaseModule, RealtimeModule], controllers: [ChatController], providers: [ChatService], exports: [ChatService] })
export class ChatModule {}
