import { Controller, Get, Param, Req, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../../shared/domain/auth.enums';
import { RealtimeService } from './realtime.service';

@Controller('realtime/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.DRIVER, Role.PRESTADOR)
export class RealtimeController {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  @Get(':orderId/stream')
  async stream(
    @Req() req: Request & { user: { sub: string } },
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Res() response: Response,
  ) {
    const userId = req.user.sub;
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, OR: [{ customerId: userId }, { delivery: { driver: { userId } } }] },
      select: { id: true },
    });
    if (!order) { response.status(403).json({ statusCode: 403, message: 'Acesso ao pedido não autorizado.' }); return; }
    const cleanup = this.realtime.subscribe(orderId, response);
    req.on('close', cleanup);
  }
}
