import {
  AccountStatus as PrismaAccountStatus,
  AdminReviewAction,
  Prisma,
  UserRole as PrismaRole,
} from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

import {
  AccountStatus,
  Role,
} from '../../../shared/domain/auth.enums';

import {
  AdminReviewRepositoryPort,
  ReviewApplicationRecord,
  ReviewDecisionResult,
} from '../domain/admin-review.repository';

@Injectable()
export class PrismaAdminReviewRepository extends AdminReviewRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private map(
    user: Prisma.UserGetPayload<{
      include: {
        driver: true;
        supplier: true;
      };
    }>,
  ): ReviewApplicationRecord {
    const profile: ReviewApplicationRecord['profile'] = user.driver
      ? {
          fullName: user.driver.fullName,
          documentNumber: user.driver.documentNumber,
          vehicleType: user.driver.vehicleType,
        }
      : user.supplier
        ? {
            legalName: user.supplier.legalName,
            tradeName: user.supplier.tradeName,
            nif: user.supplier.nif,
            responsibleName: user.supplier.responsibleName,
          }
        : {};

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,

      role: user.role as Role,
      status: user.status as AccountStatus,

      createdAt: user.createdAt,
      reviewedAt: user.reviewedAt,
      reviewNote: user.reviewNote,

      profile: {
        fullName: profile.fullName,
        documentNumber: profile.documentNumber,
        vehicleType: profile.vehicleType,
        legalName: profile.legalName,
        tradeName: profile.tradeName,
        nif: profile.nif,
        responsibleName: profile.responsibleName,
      },
    };
  }

  async listApplications(filter: {
    role?: Role;
    status?: AccountStatus;
  }): Promise<ReviewApplicationRecord[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: filter.role
          ? (filter.role as PrismaRole)
          : {
              in: [
                PrismaRole.DRIVER,
                PrismaRole.SUPPLIER,
              ],
            },

        status: filter.status
          ? (filter.status as PrismaAccountStatus)
          : {
              in: [
                PrismaAccountStatus.PENDING_REVIEW,
                PrismaAccountStatus.DOCUMENTS_REQUIRED,
              ],
            },
      },

      include: {
        driver: true,
        supplier: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    return users.map((user) => this.map(user));
  }

  async findApplicationById(
    userId: string,
  ): Promise<ReviewApplicationRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      include: {
        driver: true,
        supplier: true,
      },
    });

    if (!user) {
      return null;
    }

    // Não usar Array.includes aqui porque o TypeScript
    // pode inferir o array como ("DRIVER" | "SUPPLIER")[]
    // enquanto user.role é UserRole completo.
    if (
      user.role !== PrismaRole.DRIVER &&
      user.role !== PrismaRole.SUPPLIER
    ) {
      return null;
    }

    return this.map(user);
  }

  async changeStatus(input: {
    adminUserId: string;
    targetUserId: string;
    targetRole: Role;
    fromStatus: AccountStatus;
    toStatus: AccountStatus;
    reason?: string;
  }): Promise<ReviewDecisionResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: {
          id: input.targetUserId,
        },

        include: {
          driver: true,
          supplier: true,
        },
      });

      if (
        !current ||
        current.role !== (input.targetRole as PrismaRole)
      ) {
        throw new NotFoundException(
          'Candidatura não encontrada.',
        );
      }

      if (
        current.status !==
        (input.fromStatus as PrismaAccountStatus)
      ) {
        throw new ConflictException(
          'O estado da candidatura mudou. Atualize a lista e tente novamente.',
        );
      }

      const action = this.mapAction(input.toStatus);

      if (!action) {
        throw new ConflictException(
          'Decisão de revisão inválida.',
        );
      }

      const updated = await tx.user.update({
        where: {
          id: input.targetUserId,
        },

        data: {
          status: input.toStatus as PrismaAccountStatus,
          reviewNote: input.reason?.trim() || null,
          reviewedAt: new Date(),
        },

        include: {
          driver: true,
          supplier: true,
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorUserId: input.adminUserId,
          targetUserId: input.targetUserId,
          action,
          reason: input.reason?.trim() || null,
          entity: 'PARTNER',
          entityId: input.targetUserId,
        },
      });

      return {
        updated,
        auditId: audit.id,
      };
    });

    return {
      ...this.map(result.updated),
      auditId: result.auditId,
    };
  }

  private mapAction(
    status: AccountStatus,
  ): AdminReviewAction | null {
    switch (status) {
      case AccountStatus.ACTIVE:
        return AdminReviewAction.APPROVED;

      case AccountStatus.REJECTED:
        return AdminReviewAction.REJECTED;

      case AccountStatus.DOCUMENTS_REQUIRED:
        return AdminReviewAction.DOCUMENTS_REQUESTED;

      default:
        return null;
    }
  }
}