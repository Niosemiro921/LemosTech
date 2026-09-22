import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, Role } from '../../../shared/domain/auth.enums';
import { AdminReviewRepositoryPort } from '../domain/admin-review.repository';

@Injectable()
export class AdminService {
  constructor(private readonly reviews: AdminReviewRepositoryPort) {}

  listApplications(role?: Role, status?: AccountStatus) {
    if (role === Role.CUSTOMER || role === Role.ADMIN) {
      throw new BadRequestException('A revisão administrativa aceita apenas DRIVER ou SUPPLIER.');
    }
    return this.reviews.listApplications({ role, status });
  }

  async getApplication(userId: string) {
    const application = await this.reviews.findApplicationById(userId);
    if (!application) throw new NotFoundException('Candidatura não encontrada.');
    return application;
  }

  async approve(adminUserId: string, userId: string, reason?: string) {
    const current = await this.getApplication(userId);
    this.assertReviewable(current.status);
    return this.reviews.changeStatus({
      adminUserId,
      targetUserId: userId,
      targetRole: current.role,
      fromStatus: current.status,
      toStatus: AccountStatus.ACTIVE,
      reason,
    });
  }

  async reject(adminUserId: string, userId: string, reason?: string) {
    const current = await this.getApplication(userId);
    this.assertReviewable(current.status);
    if (!reason?.trim()) throw new BadRequestException('O motivo da rejeição é obrigatório.');
    return this.reviews.changeStatus({
      adminUserId,
      targetUserId: userId,
      targetRole: current.role,
      fromStatus: current.status,
      toStatus: AccountStatus.REJECTED,
      reason,
    });
  }

  async requestDocuments(adminUserId: string, userId: string, reason?: string) {
    const current = await this.getApplication(userId);
    this.assertReviewable(current.status);
    if (!reason?.trim()) throw new BadRequestException('Indique quais documentos/informações são necessários.');
    return this.reviews.changeStatus({
      adminUserId,
      targetUserId: userId,
      targetRole: current.role,
      fromStatus: current.status,
      toStatus: AccountStatus.DOCUMENTS_REQUIRED,
      reason,
    });
  }

  private assertReviewable(status: AccountStatus) {
    if (![AccountStatus.PENDING_REVIEW, AccountStatus.DOCUMENTS_REQUIRED].includes(status)) {
      throw new BadRequestException('Esta candidatura não está em estado de revisão.');
    }
  }
}
