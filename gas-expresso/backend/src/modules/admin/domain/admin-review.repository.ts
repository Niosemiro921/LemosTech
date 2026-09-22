import { AccountStatus, Role } from '../../../shared/domain/auth.enums';

export interface ReviewApplicationRecord {
  id: string;
  phone: string;
  email: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
  profile: {
    fullName?: string;
    documentNumber?: string;
    vehicleType?: string;
    legalName?: string;
    tradeName?: string;
    nif?: string;
    responsibleName?: string;
  };
}

export interface ReviewDecisionResult extends ReviewApplicationRecord {
  auditId: string;
}

export abstract class AdminReviewRepositoryPort {
  abstract listApplications(filter: {
    role?: Role;
    status?: AccountStatus;
  }): Promise<ReviewApplicationRecord[]>;
  abstract findApplicationById(userId: string): Promise<ReviewApplicationRecord | null>;
  abstract changeStatus(input: {
    adminUserId: string;
    targetUserId: string;
    targetRole: Role;
    fromStatus: AccountStatus;
    toStatus: AccountStatus;
    reason?: string;
  }): Promise<ReviewDecisionResult>;
}
