import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AccountStatus } from '../../../shared/domain/auth.enums';

@Injectable()
export class ActiveAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { status?: AccountStatus } }>();
    if (request.user?.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('A sua conta ainda não está autorizada a operar.');
    }
    return true;
  }
}
