import { Controller, Post, Body } from '@nestjs/common';
import { AnalyticsEventDto } from '../dto/analytics.dto';

@Controller('analytics')
export class AnalyticsController {
  @Post('events')
  async trackEvent(@Body() dto: AnalyticsEventDto): Promise<{ tracked: boolean }> {
    console.log('[ANALYTICS]', {
      sessionId: dto.sessionId,
      eventType: dto.eventType,
      area: dto.area,
      path: dto.path,
      target: dto.target,
    });
    return { tracked: true };
  }
}