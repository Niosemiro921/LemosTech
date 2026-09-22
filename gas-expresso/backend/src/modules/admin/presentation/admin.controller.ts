import { Controller, Get, Param, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AccountStatus, Role } from '../../../shared/domain/auth.enums';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminService } from '../application/admin.service';
import { ReviewDecisionDto } from '../application/dto/review-decision.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('applications')
  list(
    @Query('role') role?: Role,
    @Query('status') status?: AccountStatus,
  ) {
    return this.admin.listApplications(role, status);
  }

  @Get('applications/:userId')
  get(@Param('userId') userId: string) {
    return this.admin.getApplication(userId);
  }

  @Post('applications/:userId/approve')
  approve(
    @Param('userId') userId: string,
    @Body() dto: ReviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.admin.approve(req.user.sub, userId, dto.reason);
  }

  @Post('applications/:userId/reject')
  reject(
    @Param('userId') userId: string,
    @Body() dto: ReviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.admin.reject(req.user.sub, userId, dto.reason);
  }

  @Post('applications/:userId/request-documents')
  requestDocuments(
    @Param('userId') userId: string,
    @Body() dto: ReviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.admin.requestDocuments(req.user.sub, userId, dto.reason);
  }
}
