import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsEventDto } from '../dto/analytics.dto';
import { AnalyticsService } from '../application/analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '../../../shared/domain/auth.enums';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('events')
  async trackEvent(@Body() dto: AnalyticsEventDto) { return { tracked: true, event: await this.service.track(dto) }; }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('summary')
  async summary(@Query('area') area?: string, @Query('sessionId') sessionId?: string) { return this.service.summarize(area, sessionId); }
}