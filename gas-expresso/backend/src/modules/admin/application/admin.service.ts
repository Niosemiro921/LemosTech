import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus as PrismaAccountStatus, AdminReviewAction as PrismaAdminReviewAction, OrderStatus as PrismaOrderStatus, Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { AccountStatus, Role } from '../../../shared/domain/auth.enums';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DispatchService } from '../../dispatch/application/dispatch.service';
import { DriverFinanceService } from '../../driver-finance/application/driver-finance.service';
import { AdminReviewRepositoryPort } from '../domain/admin-review.repository';
import { MailService } from '../../mail/mail.service';
import { SendEmailDto } from './dto/send-email.dto';

type PartnerAction = 'approve' | 'reject' | 'suspend' | 'reactivate';
type PartnerRecord = Prisma.UserGetPayload<{ include: { driver: true; supplier: true } }>;

@Injectable()
export class AdminService {
  constructor(
    private readonly reviews: AdminReviewRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
    private readonly driverFinance: DriverFinanceService,
    private readonly mail: MailService,
  ) {}

  async getOverview() {
    const expirationLimit = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [customers, companies, drivers, prestadores, activeOrders, completedOrders, completedRevenue, pendingApplications, incidentsOpen, expiringDocuments] = await Promise.all([
      this.prisma.user.count({ where: { role: PrismaUserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: PrismaUserRole.SUPPLIER } }),
      this.prisma.user.count({ where: { role: PrismaUserRole.DRIVER } }),
      this.prisma.user.count({ where: { role: PrismaUserRole.PRESTADOR } }),
      this.prisma.order.count({
        where: {
          status: {
            notIn: [
              PrismaOrderStatus.DELIVERED,
              PrismaOrderStatus.COMPLETED,
              PrismaOrderStatus.CANCELLED,
              PrismaOrderStatus.FAILED,
            ],
          },
        },
      }),
      this.prisma.order.count({
        where: { status: { in: [PrismaOrderStatus.DELIVERED, PrismaOrderStatus.COMPLETED] } },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: [PrismaOrderStatus.DELIVERED, PrismaOrderStatus.COMPLETED] } },
        _sum: { total: true },
      }),
      this.prisma.user.count({
        where: {
          role: { in: [PrismaUserRole.DRIVER, PrismaUserRole.PRESTADOR, PrismaUserRole.SUPPLIER] },
          status: { in: [PrismaAccountStatus.PENDING_REVIEW, PrismaAccountStatus.DOCUMENTS_REQUIRED] },
        },
      }),
      this.prisma.incident.count({ where: { status: 'OPEN' } }),
      this.prisma.businessDocument.count({
        where: {
          status: 'APPROVED',
          expiresAt: { gte: new Date(), lte: expirationLimit },
        },
      }),
    ]);

    const [walletTopUpsPending, walletWithdrawalsPending] = await Promise.all([
      this.prisma.walletTopUp.count({ where: { status: 'PENDING' } }),
      this.prisma.walletWithdrawal.count({ where: { status: 'PENDING' } }),
    ]);
    const byStatus = await Promise.all(Object.values(PrismaAccountStatus).map(async (status) => [status, await this.prisma.user.count({ where: { status } })] as const));
    return { customers, companies, drivers, prestadores, activeOrders, completedOrders, revenue: completedRevenue._sum.total ?? 0, incidentsOpen, pendingApplications, expiringDocuments, walletTopUpsPending, walletWithdrawalsPending, usersByStatus: Object.fromEntries(byStatus), usersByRole: { CUSTOMER: customers, DRIVER: drivers, PRESTADOR: prestadores, SUPPLIER: companies } };
  }

  async listPartners(type?: string) {
    if (type && ![Role.DRIVER, Role.PRESTADOR, Role.SUPPLIER].includes(type as Role)) {
      throw new BadRequestException('O tipo de parceiro deve ser DRIVER, PRESTADOR ou SUPPLIER.');
    }

    const partners = await this.prisma.user.findMany({
      where: {
        role: type ? (type as PrismaUserRole) : { in: [PrismaUserRole.DRIVER, PrismaUserRole.PRESTADOR, PrismaUserRole.SUPPLIER] },
      },
      include: { driver: true, supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    return partners.map((partner) => this.partnerView(partner));
  }

  async updatePartnerStatus(adminUserId: string, userId: string, action: PartnerAction, reason?: string) {
    const transitions: Record<PartnerAction, {
      from: PrismaAccountStatus[];
      to: PrismaAccountStatus;
      auditAction: PrismaAdminReviewAction;
    }> = {
      approve: {
        from: [PrismaAccountStatus.PENDING_REVIEW, PrismaAccountStatus.DOCUMENTS_REQUIRED],
        to: PrismaAccountStatus.ACTIVE,
        auditAction: PrismaAdminReviewAction.APPROVED,
      },
      reject: {
        from: [PrismaAccountStatus.PENDING_REVIEW, PrismaAccountStatus.DOCUMENTS_REQUIRED],
        to: PrismaAccountStatus.REJECTED,
        auditAction: PrismaAdminReviewAction.REJECTED,
      },
      suspend: {
        from: [PrismaAccountStatus.ACTIVE],
        to: PrismaAccountStatus.SUSPENDED,
        auditAction: PrismaAdminReviewAction.PARTNER_SUSPENDED,
      },
      reactivate: {
        from: [PrismaAccountStatus.SUSPENDED, PrismaAccountStatus.REJECTED],
        to: PrismaAccountStatus.ACTIVE,
        auditAction: PrismaAdminReviewAction.PARTNER_REACTIVATED,
      },
    };
    const transition = transitions[action];
    if (!transition) throw new BadRequestException('Ação de parceiro inválida.');
    const normalizedReason = reason?.trim() || null;
    if (action === 'reject' && !normalizedReason) {
      throw new BadRequestException('O motivo da rejeição é obrigatório.');
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        include: { driver: true, supplier: true },
      });
      if (!current || !([PrismaUserRole.DRIVER, PrismaUserRole.PRESTADOR, PrismaUserRole.SUPPLIER] as PrismaUserRole[]).includes(current.role)) {
        throw new NotFoundException('Parceiro não encontrado.');
      }
      if (!transition.from.includes(current.status)) {
        throw new ConflictException(`A ação ${action} não é permitida para o estado ${current.status}.`);
      }

      const changed = await tx.user.updateMany({
        where: { id: userId, role: current.role, status: current.status },
        data: { status: transition.to, reviewedAt: new Date(), reviewNote: normalizedReason },
      });
      if (changed.count !== 1) throw new ConflictException('O estado do parceiro mudou. Atualize a lista e tente novamente.');

      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          targetUserId: userId,
          action: transition.auditAction,
          reason: normalizedReason,
          entity: 'PARTNER',
          entityId: userId,
        },
      });

      const updated = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { driver: true, supplier: true },
      });
      return this.partnerView(updated);
    });
  }

  async listOrders() {
    const orders = await this.prisma.order.findMany({
      include: {
        customer: { include: { customer: true } },
        supplier: true,
        delivery: { include: { driver: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return orders.map((order) => ({
      id: order.id,
      reference: order.reference,
      status: order.status,
      customer: order.customer.customer?.fullName ?? order.customer.phone,
      supplier: order.supplier?.tradeName ?? null,
      driver: order.delivery?.driver.fullName ?? null,
      total: order.total,
      createdAt: order.createdAt,
    }));
  }

  async getDispatchQueue() {
    return this.dispatch.getAdminQueue();
  }

  async retryDispatch(adminUserId: string, orderId: string) {
    return this.dispatch.startForOrder(orderId, 3, adminUserId, PrismaUserRole.ADMIN);
  }

  listWalletTopUps() {
    return this.driverFinance.listPendingTopUps();
  }

  decideWalletTopUp(adminUserId: string, id: string, approve: boolean, reason?: string) {
    return this.driverFinance.decideTopUp(adminUserId, id, approve, reason);
  }

  listWalletWithdrawals() { return this.driverFinance.listPendingWithdrawals(); }

  approveWalletWithdrawal(adminUserId: string, id: string, reason?: string) { return this.driverFinance.decideWithdrawal(adminUserId, id, 'APPROVE', reason); }
  rejectWalletWithdrawal(adminUserId: string, id: string, reason: string) { return this.driverFinance.decideWithdrawal(adminUserId, id, 'REJECT', reason); }
  payWalletWithdrawal(adminUserId: string, id: string, reason?: string) { return this.driverFinance.decideWithdrawal(adminUserId, id, 'PAY', reason); }

  async sendEmail(adminUserId: string, dto: SendEmailDto) {
    let to = dto.to?.trim();
    if (!to && dto.userId) {
      const target = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { email: true } });
      if (!target?.email) throw new BadRequestException('O utilizador selecionado não possui email.');
      to = target.email;
    }
    if (!to) throw new BadRequestException('Informe um destinatário ou userId.');
    const result = await this.mail.send(to, dto.subject, dto.message);
    await this.prisma.auditLog.create({ data: { actorUserId: adminUserId, action: PrismaAdminReviewAction.EMAIL_SENT, reason: `Email enviado para ${to}: ${dto.subject}`.slice(0, 1000), entity: 'EMAIL', entityId: dto.userId ?? null } });
    return result;
  }

  async listAuditLog() {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const userIds = [...new Set(entries.flatMap((entry) => [entry.actorUserId, entry.targetUserId].filter((id): id is string => id !== null)))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        phone: true,
        customer: { select: { fullName: true } },
        driver: { select: { fullName: true } },
        supplier: { select: { tradeName: true } },
      },
    });
    const names = new Map(users.map((user) => [
      user.id,
      user.driver?.fullName ?? user.supplier?.tradeName ?? user.customer?.fullName ?? user.phone,
    ]));

    return entries.map((entry) => ({
      id: entry.id,
      actor: names.get(entry.actorUserId) ?? entry.actorUserId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? entry.targetUserId ?? entry.id,
      summary: entry.reason ?? `${entry.action} · ${names.get(entry.targetUserId ?? '') ?? entry.entityId ?? entry.id}`,
      createdAt: entry.createdAt,
    }));
  }

  listApplications(role?: Role, status?: AccountStatus) {
    if (role === Role.CUSTOMER || role === Role.ADMIN) {
      throw new BadRequestException('A revisão administrativa aceita apenas DRIVER, PRESTADOR ou SUPPLIER.');
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

  private partnerView(partner: PartnerRecord) {
    return {
      id: partner.id,
      name: partner.driver?.fullName ?? partner.supplier?.tradeName ?? partner.supplier?.legalName ?? partner.phone,
      type: partner.role,
      status: partner.status,
      phone: partner.phone,
      createdAt: partner.createdAt,
    };
  }
}
