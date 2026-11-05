import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingCycle, Prisma, SubscriptionInvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateBillingPlanDto,
  CreateSubscriptionInvoiceDto,
  SubmitInvoiceProofDto,
  UpdateBillingPlanDto,
} from '../dto/billing.dto';

const TRIAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_PLANS = [
  { code: 'STARTER', name: 'Básico', description: 'Uma filial, operação essencial e relatórios.', priceMonthly: 25000, priceYearly: 250000, maxBranches: 1, maxUsers: 5 },
  { code: 'PRO', name: 'Pro', description: 'Várias filiais, equipa alargada e relatórios completos.', priceMonthly: 45000, priceYearly: 450000, maxBranches: 5, maxUsers: 25 },
  { code: 'ENTERPRISE', name: 'Enterprise', description: 'Operação ilimitada e acompanhamento dedicado.', priceMonthly: 75000, priceYearly: 750000, maxBranches: null, maxUsers: null },
];

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function addYears(date: Date, years: number) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

type SubscriptionWithPlan = Prisma.CompanySubscriptionGetPayload<{ include: { plan: true } }>;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultPlans() {
    const count = await this.prisma.billingPlan.count();
    if (count > 0) return;
    await this.prisma.billingPlan.createMany({ data: DEFAULT_PLANS, skipDuplicates: true });
  }

  private async getSupplier(userId: string) {
    const supplier = await this.prisma.supplierProfile.findUnique({ where: { userId } });
    if (!supplier) throw new NotFoundException('Perfil de fornecedor não encontrado.');
    return supplier;
  }

  private async getDefaultPlan() {
    await this.ensureDefaultPlans();
    const plan = await this.prisma.billingPlan.findFirst({ where: { active: true }, orderBy: { priceMonthly: 'asc' } });
    if (!plan) throw new ConflictException('Não existe nenhum plano de assinatura ativo. Configure os planos no backoffice.');
    return plan;
  }

  private async refreshSubscription(subscription: SubscriptionWithPlan): Promise<SubscriptionWithPlan> {
    const now = Date.now();
    let nextStatus = subscription.status;
    if (subscription.status === SubscriptionStatus.TRIAL && subscription.trialEndsAt && subscription.trialEndsAt.getTime() < now) {
      nextStatus = SubscriptionStatus.PAST_DUE;
    }
    if (subscription.status === SubscriptionStatus.ACTIVE && subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() < now) {
      nextStatus = SubscriptionStatus.PAST_DUE;
    }
    if (nextStatus !== subscription.status) {
      return this.prisma.companySubscription.update({ where: { id: subscription.id }, data: { status: nextStatus }, include: { plan: true } });
    }
    return subscription;
  }

  private async getOrCreateBySupplierId(supplierId: string) {
    let subscription = await this.prisma.companySubscription.findUnique({ where: { supplierId }, include: { plan: true } });
    if (!subscription) {
      const plan = await this.getDefaultPlan();
      subscription = await this.prisma.companySubscription.create({
        data: {
          supplierId,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          billingCycle: BillingCycle.MONTHLY,
          trialEndsAt: addDays(new Date(), TRIAL_DAYS),
        },
        include: { plan: true },
      });
    }
    return this.refreshSubscription(subscription);
  }

  private subscriptionView(subscription: SubscriptionWithPlan) {
    const end = subscription.status === SubscriptionStatus.TRIAL ? subscription.trialEndsAt : subscription.currentPeriodEnd;
    const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS)) : null;
    return {
      ...subscription,
      daysRemaining,
      canOperate: subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIAL,
    };
  }

  async getOverview(userId: string) {
    const supplier = await this.getSupplier(userId);
    await this.ensureDefaultPlans();
    const subscription = await this.getOrCreateBySupplierId(supplier.id);
    const [plans, invoices] = await Promise.all([
      this.prisma.billingPlan.findMany({ where: { active: true }, orderBy: { priceMonthly: 'asc' } }),
      this.prisma.subscriptionInvoice.findMany({ where: { supplierId: supplier.id }, orderBy: { createdAt: 'desc' }, include: { plan: true } }),
    ]);
    return {
      supplier: { id: supplier.id, name: supplier.tradeName },
      subscription: this.subscriptionView(subscription),
      plans,
      invoices,
      paymentInstructions: {
        bank: process.env.BILLING_BANK?.trim() || 'Banco a configurar',
        iban: process.env.BILLING_IBAN?.trim() || 'AO06 0000 0000 0000 0000 0000 0',
        accountName: process.env.BILLING_ACCOUNT_NAME?.trim() || 'Gás Expresso',
        note: 'Transferência direta. Após transferir, anexe o comprovativo na fatura correspondente.',
      },
    };
  }

  async listInvoices(userId: string) {
    const supplier = await this.getSupplier(userId);
    return this.prisma.subscriptionInvoice.findMany({ where: { supplierId: supplier.id }, orderBy: { createdAt: 'desc' }, include: { plan: true } });
  }

  async createInvoice(userId: string, dto: CreateSubscriptionInvoiceDto) {
    const supplier = await this.getSupplier(userId);
    const subscription = await this.getOrCreateBySupplierId(supplier.id);
    const plan = await this.prisma.billingPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.active) throw new BadRequestException('Plano de assinatura inválido ou inativo.');

    const existing = await this.prisma.subscriptionInvoice.findFirst({
      where: { supplierId: supplier.id, planId: plan.id, billingCycle: dto.billingCycle, status: { in: [SubscriptionInvoiceStatus.PENDING, SubscriptionInvoiceStatus.AWAITING_CONFIRMATION] } },
    });
    if (existing) {
      throw new ConflictException('Já existe uma fatura em aberto para este plano e ciclo. Conclua ou aguarde a revisão antes de criar outra.');
    }

    const now = new Date();
    const start = subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime() && subscription.status === SubscriptionStatus.ACTIVE
      ? subscription.currentPeriodEnd
      : now;
    const periodEnd = dto.billingCycle === BillingCycle.YEARLY ? addYears(start, 1) : addMonths(start, 1);
    const amount = dto.billingCycle === BillingCycle.YEARLY ? plan.priceYearly : plan.priceMonthly;
    const number = `SUB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    return this.prisma.subscriptionInvoice.create({
      data: {
        supplierId: supplier.id,
        subscriptionId: subscription.id,
        planId: plan.id,
        number,
        amount,
        billingCycle: dto.billingCycle,
        status: SubscriptionInvoiceStatus.PENDING,
        periodStart: start,
        periodEnd,
      },
      include: { plan: true },
    });
  }

  async submitProof(userId: string, invoiceId: string, dto: SubmitInvoiceProofDto) {
    const supplier = await this.getSupplier(userId);
    const invoice = await this.prisma.subscriptionInvoice.findFirst({ where: { id: invoiceId, supplierId: supplier.id } });
    if (!invoice) throw new NotFoundException('Fatura de assinatura não encontrada.');
    if (!(([SubscriptionInvoiceStatus.PENDING, SubscriptionInvoiceStatus.REJECTED] as SubscriptionInvoiceStatus[]).includes(invoice.status))) {
      throw new ConflictException('Esta fatura já não aceita comprovativos.');
    }
    return this.prisma.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        proofUrl: dto.proofUrl.trim(),
        proofNote: dto.proofNote?.trim() || null,
        submittedAt: new Date(),
        status: SubscriptionInvoiceStatus.AWAITING_CONFIRMATION,
        reviewNote: null,
      },
      include: { plan: true },
    });
  }

  async assertSupplierOperational(supplierId: string) {
    const subscription = await this.getOrCreateBySupplierId(supplierId);
    if (subscription.status === SubscriptionStatus.SUSPENDED || subscription.status === SubscriptionStatus.CANCELLED) {
      throw new ForbiddenException('A assinatura da empresa está suspensa. Regularize o pagamento para voltar a operar.');
    }
    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      throw new ForbiddenException('A assinatura da empresa expirou. Efetue o pagamento e aguarde a confirmação para voltar a operar.');
    }
    return subscription;
  }

  async listPlans() {
    await this.ensureDefaultPlans();
    return this.prisma.billingPlan.findMany({ orderBy: { priceMonthly: 'asc' } });
  }

  async createPlan(dto: CreateBillingPlanDto) {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.prisma.billingPlan.findUnique({ where: { code } });
    if (exists) throw new ConflictException('Já existe um plano com este código.');
    return this.prisma.billingPlan.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        maxBranches: dto.maxBranches ?? null,
        maxUsers: dto.maxUsers ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async updatePlan(id: string, dto: UpdateBillingPlanDto) {
    const plan = await this.prisma.billingPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado.');
    return this.prisma.billingPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.priceMonthly !== undefined ? { priceMonthly: dto.priceMonthly } : {}),
        ...(dto.priceYearly !== undefined ? { priceYearly: dto.priceYearly } : {}),
        ...(dto.maxBranches !== undefined ? { maxBranches: dto.maxBranches } : {}),
        ...(dto.maxUsers !== undefined ? { maxUsers: dto.maxUsers } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async listInvoicesForAdmin(status?: SubscriptionInvoiceStatus) {
    return this.prisma.subscriptionInvoice.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        plan: true,
        supplier: { select: { id: true, tradeName: true, legalName: true, nif: true, userId: true, user: { select: { phone: true, email: true } } } },
      },
    });
  }

  async listSubscriptions() {
    const subscriptions = await this.prisma.companySubscription.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        plan: true,
        supplier: { select: { id: true, tradeName: true, legalName: true, nif: true, userId: true, user: { select: { phone: true, email: true } } } },
      },
    });
    return subscriptions.map((subscription) => this.subscriptionView(subscription));
  }

  async confirmInvoice(adminUserId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.subscriptionInvoice.findUnique({
        where: { id },
        include: { plan: true, supplier: { select: { userId: true } } },
      });
      if (!invoice) throw new NotFoundException('Fatura de assinatura não encontrada.');
      if (invoice.status !== SubscriptionInvoiceStatus.AWAITING_CONFIRMATION) {
        throw new ConflictException('A fatura só pode ser confirmada depois de a empresa anexar o comprovativo.');
      }
      if (!invoice.subscriptionId) throw new ConflictException('A fatura não está associada a uma assinatura.');

      const now = new Date();
      const updated = await tx.subscriptionInvoice.update({
        where: { id },
        data: { status: SubscriptionInvoiceStatus.PAID, paidAt: now, reviewedById: adminUserId, reviewNote: null },
        include: { plan: true },
      });
      await tx.companySubscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          planId: invoice.planId,
          billingCycle: invoice.billingCycle,
          currentPeriodStart: invoice.periodStart,
          currentPeriodEnd: invoice.periodEnd,
          trialEndsAt: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          targetUserId: invoice.supplier.userId,
          action: 'SUBSCRIPTION_PAYMENT_CONFIRMED',
          reason: `Assinatura confirmada · ${invoice.number} · ${invoice.plan.name}`,
          entity: 'SUBSCRIPTION',
          entityId: invoice.id,
        },
      });
      return updated;
    });
  }

  async rejectInvoice(adminUserId: string, id: string, reason: string) {
    const normalized = reason?.trim();
    if (!normalized) throw new BadRequestException('O motivo da rejeição é obrigatório.');
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.subscriptionInvoice.findUnique({ where: { id }, include: { supplier: { select: { userId: true } } } });
      if (!invoice) throw new NotFoundException('Fatura de assinatura não encontrada.');
      if (!(([SubscriptionInvoiceStatus.PENDING, SubscriptionInvoiceStatus.AWAITING_CONFIRMATION] as SubscriptionInvoiceStatus[]).includes(invoice.status))) {
        throw new ConflictException('Esta fatura já foi processada.');
      }
      const updated = await tx.subscriptionInvoice.update({
        where: { id },
        data: { status: SubscriptionInvoiceStatus.REJECTED, reviewedById: adminUserId, reviewNote: normalized },
        include: { plan: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          targetUserId: invoice.supplier.userId,
          action: 'SUBSCRIPTION_PAYMENT_REJECTED',
          reason: `Assinatura rejeitada · ${invoice.number} · ${normalized}`.slice(0, 1000),
          entity: 'SUBSCRIPTION',
          entityId: invoice.id,
        },
      });
      return updated;
    });
  }

  async updateSubscriptionStatus(adminUserId: string, supplierId: string, action: string, reason?: string) {
    if (!['suspend', 'reactivate'].includes(action)) throw new BadRequestException('Ação de assinatura inválida.');
    const subscription = await this.prisma.companySubscription.findUnique({ where: { supplierId }, include: { supplier: { select: { userId: true } } } });
    if (!subscription) throw new NotFoundException('Assinatura não encontrada.');
    const now = new Date();
    const updated = await this.prisma.companySubscription.update({
      where: { id: subscription.id },
      data: action === 'suspend'
        ? { status: SubscriptionStatus.SUSPENDED }
        : {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: addMonths(now, 1),
            trialEndsAt: null,
          },
      include: { plan: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        targetUserId: subscription.supplier.userId,
        action: action === 'suspend' ? 'PARTNER_SUSPENDED' : 'PARTNER_REACTIVATED',
        reason: reason?.trim() || `Assinatura ${action === 'suspend' ? 'suspensa' : 'reativada'} manualmente.`,
        entity: 'SUBSCRIPTION',
        entityId: subscription.id,
      },
    });
    return this.subscriptionView(updated);
  }
}
