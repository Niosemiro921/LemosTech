import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../../shared/domain/auth.enums';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { ChatService } from '../application/chat.service';
import { SendChatMessageDto } from '../dto/send-chat-message.dto';
import { AnswerCallDto, EndCallDto, IceCandidateDto, InitiateCallDto } from '../dto/call-signaling.dto';

type ReqUser = Request & { user: { sub: string } };

@Controller('chat/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.DRIVER, Role.PRESTADOR)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(':orderId')
  get(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.chat.getOrderChat(req.user.sub, orderId);
  }

  @Post(':orderId/messages')
  send(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string, @Body() dto: SendChatMessageDto) {
    return this.chat.sendOrderMessage(req.user.sub, orderId, dto.message);
  }

  @Post(':orderId/read')
  read(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.chat.markThreadRead(req.user.sub, orderId);
  }

  // --- WebRTC Voice Call Endpoints ---

  @Post(':orderId/call/offer')
  initiateCall(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string, @Body() dto: InitiateCallDto) {
    return this.chat.initiateCall(req.user.sub, orderId, dto.sdpOffer);
  }

  @Post(':orderId/call/answer')
  answerCall(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string, @Body() dto: AnswerCallDto) {
    return this.chat.answerCall(req.user.sub, orderId, dto.sdpAnswer);
  }

  @Post(':orderId/call/ice-candidate')
  sendIceCandidate(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string, @Body() dto: IceCandidateDto) {
    return this.chat.sendIceCandidate(req.user.sub, orderId, dto.candidate);
  }

  @Post(':orderId/call/end')
  endCall(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string, @Body() dto: EndCallDto) {
    return this.chat.endCall(req.user.sub, orderId, dto?.reason);
  }

  @Get(':orderId/call/session')
  getCallSession(@Req() req: ReqUser, @Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.chat.getActiveCall(req.user.sub, orderId);
  }
}
