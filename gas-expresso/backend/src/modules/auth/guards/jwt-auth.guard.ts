import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  role: string;
  status: string;
  phone: string;
  iat?: number;
  exp?: number;
}

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

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

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Token inválido ou expirado.',
      );
    }
  }
}
