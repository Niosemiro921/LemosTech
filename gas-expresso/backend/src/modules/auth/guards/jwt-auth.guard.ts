import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  role: string;
  status: string;
  phone: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Token de autenticação não fornecido.',
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException(
        'Token de autenticação não fornecido.',
      );
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.jti) {
        const revoked = await this.prisma.revokedToken.findUnique({ where: { jti: payload.jti } });
        if (revoked && revoked.expiresAt > new Date()) throw new UnauthorizedException('Sessão terminada.');
        if (revoked && revoked.expiresAt <= new Date()) await this.prisma.revokedToken.delete({ where: { jti: payload.jti } }).catch(() => undefined);
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Token inválido ou expirado.',
      );
    }
  }
}
