import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AnalyticsEventDto } from '../dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(dto: AnalyticsEventDto) {
    return this.prisma.analyticsEvent.create({
      data: {
        sessionId: dto.sessionId,
        eventType: dto.eventType,
        area: dto.area,
        path: dto.path,
        target: dto.target ?? null,
      },
    });
  }

  async summarize(area?: string, sessionId?: string) {
    const where: Record<string, unknown> = {};
    if (area) where.area = area;
    if (sessionId) where.sessionId = sessionId;
    const counts = await this.prisma.analyticsEvent.groupBy({
      by: ['eventType', 'area'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return { counts, total: await this.prisma.analyticsEvent.count({ where }) };
  }
}
