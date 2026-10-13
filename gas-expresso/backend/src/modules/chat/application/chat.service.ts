import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CallStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async getOrderChat(userId: string, orderId: string) {
    const participants = await this.getParticipants(userId, orderId);
    const thread = await this.ensureThread(participants.orderId, participants.customerId, participants.professionalId);
    const messages = await this.prisma.chatMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: 'asc' }, take: 300 });
    const activeCall = await this.getActiveCall(userId, orderId);
    return {
      threadId: thread.id,
      orderId,
      customerId: participants.customerId,
      professionalId: participants.professionalId,
      customerPhone: participants.customerPhone,
      driverPhone: participants.driverPhone,
      messages: messages.map(this.publicMessage),
      activeCall,
    };
  }

  async sendOrderMessage(userId: string, orderId: string, message: string) {
    const participants = await this.getParticipants(userId, orderId);
    const thread = await this.ensureThread(participants.orderId, participants.customerId, participants.professionalId);
    const trimmed = message.trim();
    if (!trimmed) throw new ConflictException('A mensagem não pode ficar vazia.');

    const created = await this.prisma.chatMessage.create({ data: { threadId: thread.id, senderId: userId, message: trimmed } });
    const payload = this.publicMessage(created);
    this.realtime.emitChatMessage(orderId, payload);

    // Automated Chatbot Intelligence for delivery queries
    await this.processBotTriggers(orderId, thread.id, userId, trimmed, participants);

    return payload;
  }

  async markThreadRead(userId: string, orderId: string) {
    const participants = await this.getParticipants(userId, orderId);
    const thread = await this.prisma.chatThread.findUnique({ where: { orderId: participants.orderId }, select: { id: true } });
    if (!thread) return { updated: 0 };
    const result = await this.prisma.chatMessage.updateMany({ where: { threadId: thread.id, senderId: { not: userId }, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  async canJoinOrder(userId: string, orderId: string) {
    await this.getParticipants(userId, orderId);
    return true;
  }

  // --- WebRTC IN-APP FREE CALL SIGNALING ---
  async initiateCall(userId: string, orderId: string, sdpOffer: string) {
    const participants = await this.getParticipants(userId, orderId);
    const receiverId = userId === participants.customerId ? participants.professionalId : participants.customerId;

    // End any stale calls
    await this.prisma.callSession.updateMany({
      where: { orderId, status: { in: [CallStatus.OFFERING, CallStatus.RINGING, CallStatus.CONNECTED] } },
      data: { status: CallStatus.ENDED, endedAt: new Date() },
    });

    const session = await this.prisma.callSession.create({
      data: {
        orderId,
        callerId: userId,
        receiverId,
        status: CallStatus.OFFERING,
        sdpOffer,
        iceCandidates: [],
      },
      include: {
        caller: { select: { id: true, phone: true, role: true } },
        receiver: { select: { id: true, phone: true, role: true } },
      },
    });

    const payload = {
      callId: session.id,
      orderId,
      callerId: userId,
      receiverId,
      sdpOffer,
      status: session.status,
      createdAt: session.createdAt,
    };

    this.realtime.emitOrderEvent(orderId, 'call:offer', payload);
    return payload;
  }

  async answerCall(userId: string, orderId: string, sdpAnswer: string) {
    const session = await this.prisma.callSession.findFirst({
      where: { orderId, receiverId: userId, status: { in: [CallStatus.OFFERING, CallStatus.RINGING] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) throw new NotFoundException('Nenhuma chamada a aguardar resposta para este pedido.');

    const updated = await this.prisma.callSession.update({
      where: { id: session.id },
      data: { status: CallStatus.CONNECTED, sdpAnswer },
    });

    const payload = {
      callId: updated.id,
      orderId,
      callerId: updated.callerId,
      receiverId: updated.receiverId,
      sdpAnswer,
      status: updated.status,
    };

    this.realtime.emitOrderEvent(orderId, 'call:answer', payload);
    return payload;
  }

  async sendIceCandidate(userId: string, orderId: string, candidate: unknown) {
    const session = await this.prisma.callSession.findFirst({
      where: {
        orderId,
        OR: [{ callerId: userId }, { receiverId: userId }],
        status: { in: [CallStatus.OFFERING, CallStatus.RINGING, CallStatus.CONNECTED] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) return { received: false };

    const candidates = Array.isArray(session.iceCandidates) ? session.iceCandidates : [];
    const updatedCandidates = [...candidates, { senderId: userId, candidate, at: new Date().toISOString() }];

    await this.prisma.callSession.update({
      where: { id: session.id },
      data: { iceCandidates: updatedCandidates as Prisma.InputJsonValue },
    });

    const payload = {
      callId: session.id,
      orderId,
      senderId: userId,
      candidate,
    };

    this.realtime.emitOrderEvent(orderId, 'call:ice-candidate', payload);
    return { received: true };
  }

  async endCall(userId: string, orderId: string, reason?: string) {
    const session = await this.prisma.callSession.findFirst({
      where: {
        orderId,
        OR: [{ callerId: userId }, { receiverId: userId }],
        status: { in: [CallStatus.OFFERING, CallStatus.RINGING, CallStatus.CONNECTED] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) return { ended: false };

    const status = session.status === CallStatus.OFFERING && session.receiverId === userId ? CallStatus.REJECTED : CallStatus.ENDED;
    await this.prisma.callSession.update({
      where: { id: session.id },
      data: { status, endedAt: new Date() },
    });

    const payload = {
      callId: session.id,
      orderId,
      endedBy: userId,
      status,
      reason: reason ?? 'Chamada terminada.',
    };

    this.realtime.emitOrderEvent(orderId, 'call:ended', payload);
    return { ended: true, callId: session.id, status };
  }

  async getActiveCall(userId: string, orderId: string) {
    const session = await this.prisma.callSession.findFirst({
      where: {
        orderId,
        OR: [{ callerId: userId }, { receiverId: userId }],
        status: { in: [CallStatus.OFFERING, CallStatus.RINGING, CallStatus.CONNECTED] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) return null;
    return {
      id: session.id,
      orderId: session.orderId,
      callerId: session.callerId,
      receiverId: session.receiverId,
      status: session.status,
      sdpOffer: session.sdpOffer,
      sdpAnswer: session.sdpAnswer,
      createdAt: session.createdAt,
    };
  }

  // --- AUTOMATED CHATBOT ASSISTANT ---
  private async processBotTriggers(
    orderId: string,
    threadId: string,
    senderId: string,
    text: string,
    participants: { customerId: string; professionalId: string },
  ) {
    const lower = text.toLowerCase();
    let botResponse: string | null = null;

    if (lower.includes('fuga') || lower.includes('vazamento') || lower.includes('cheiro a gas') || lower.includes('cheiro a gás')) {
      botResponse =
        '🛡️ Dica de Segurança Gás Expresso: Se suspeitar de fuga de gás, feche o redutor imediatamente e abra portas e janelas para ventilar. Nunca use fósforos, isqueiros ou interruptores elétricos. Teste a vedação aplicando espuma de sabão com uma esponja na válvula — se fizer bolhas, há fuga. O entregador também pode ajudar a inspecionar na entrega.';
    } else if (lower.startsWith('/bot') || lower.includes('ajuda bot') || lower.includes('assistente')) {
      botResponse =
        '🤖 Olá! Sou o Assistente Gás Expresso. Vocês podem conversar livremente por texto, usar as respostas rápidas abaixo ou fazer uma chamada de voz gratuita pelo botão 📞 Chamada de Voz.';
    }

    if (botResponse) {
      setTimeout(async () => {
        try {
          const botMsg = await this.prisma.chatMessage.create({
            data: {
              threadId,
              senderId: participants.customerId === senderId ? participants.professionalId : participants.customerId,
              message: botResponse!,
            },
          });
          this.realtime.emitChatMessage(orderId, {
            ...this.publicMessage(botMsg),
            isBot: true,
          });
        } catch {
          // ignore background bot log error
        }
      }, 500);
    }
  }

  private async getParticipants(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { phone: true } },
        delivery: { include: { driver: { include: { user: { select: { phone: true } } } } } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    const customerId = order.customerId;
    const professionalId = order.delivery?.driver.userId ?? null;
    if (!professionalId) throw new ConflictException('O pedido ainda não tem um profissional de entrega associado.');
    if (userId !== customerId && userId !== professionalId) throw new ConflictException('Não está autorizado a aceder ao chat deste pedido.');
    return {
      orderId: order.id,
      customerId,
      professionalId,
      customerPhone: order.customer.phone,
      driverPhone: order.delivery?.driver.user.phone ?? null,
    };
  }

  private async ensureThread(orderId: string, customerId: string, professionalId: string) {
    return this.prisma.chatThread.upsert({ where: { orderId }, create: { orderId, customerId, professionalId }, update: { customerId, professionalId } });
  }

  private publicMessage(message: { id: string; senderId: string; message: string; createdAt: Date; readAt: Date | null }) {
    return { id: message.id, senderId: message.senderId, message: message.message, createdAt: message.createdAt, readAt: message.readAt };
  }
}
