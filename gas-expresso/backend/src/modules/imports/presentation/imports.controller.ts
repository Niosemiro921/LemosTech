import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Role } from '../../../shared/domain/auth.enums';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ImportsService, MAX_FILE_SIZE, type UploadedCsvFile } from '../application/imports.service';

type ReqUser = Request & { user: { sub: string; role: string } };

@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
@Roles(Role.ADMIN, Role.SUPPLIER)
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Get('templates/:entity')
  template(@Param('entity') entity: string) {
    return this.service.getTemplate(entity);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  preview(
    @Req() req: ReqUser,
    @UploadedFile() file: UploadedCsvFile | undefined,
    @Body() body: { entity?: string; supplierUserId?: string },
  ) {
    return this.service.preview(req.user, body?.entity, file, body?.supplierUserId);
  }

  @Post('commit')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  commit(
    @Req() req: ReqUser,
    @UploadedFile() file: UploadedCsvFile | undefined,
    @Body() body: { entity?: string; supplierUserId?: string },
  ) {
    return this.service.commit(req.user, body?.entity, file, body?.supplierUserId);
  }
}
