import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../../shared/domain/auth.enums';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CoordinatesQueryDto,
  CreateAddressDto,
  CreateIncidentDto,
  CreateSupportTicketDto,
  UpdateAddressDto,
  UpdateSupplierScheduleDto,
} from '../dto/operations.dto';
import { OperationsService } from '../application/operations.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('customers/me/addresses')
  @Roles(Role.CUSTOMER)
  listAddresses(@Req() req: AuthenticatedRequest) {
    return this.operations.listAddresses(req.user.sub);
  }

  @Post('customers/me/addresses')
  @Roles(Role.CUSTOMER)
  createAddress(@Req() req: AuthenticatedRequest, @Body() dto: CreateAddressDto) {
    return this.operations.createAddress(req.user.sub, dto);
  }

  @Patch('customers/me/addresses/:id')
  @Roles(Role.CUSTOMER)
  updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.operations.updateAddress(req.user.sub, id, dto);
  }

  @Delete('customers/me/addresses/:id')
  @Roles(Role.CUSTOMER)
  deleteAddress(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.operations.deleteAddress(req.user.sub, id);
  }

  @Get('notifications')
  listNotifications(@Req() req: AuthenticatedRequest) {
    return this.operations.listNotifications(req.user.sub);
  }

  @Post('notifications/:id/read')
  markNotificationRead(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.operations.markNotificationRead(req.user.sub, id);
  }

  @Post('notifications/read-all')
  markAllNotificationsRead(@Req() req: AuthenticatedRequest) {
    return this.operations.markAllNotificationsRead(req.user.sub);
  }

  @Get('support/tickets')
  listSupportTickets(@Req() req: AuthenticatedRequest) {
    return this.operations.listSupportTickets(req.user.sub);
  }

  @Post('support/tickets')
  createSupportTicket(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupportTicketDto) {
    return this.operations.createSupportTicket(req.user.sub, dto);
  }

  @Get('incidents/mine')
  @Roles(Role.DRIVER, Role.PRESTADOR, Role.SUPPLIER)
  listIncidents(@Req() req: AuthenticatedRequest) {
    return this.operations.listIncidents(req.user.sub);
  }

  @Post('incidents')
  @Roles(Role.DRIVER, Role.PRESTADOR, Role.SUPPLIER)
  createIncident(@Req() req: AuthenticatedRequest, @Body() dto: CreateIncidentDto) {
    return this.operations.createIncident(req.user.sub, dto);
  }

  @Get('drivers/me/documents')
  @Roles(Role.DRIVER, Role.PRESTADOR)
  listDriverDocuments(@Req() req: AuthenticatedRequest) {
    return this.operations.listDocuments(req.user.sub, Role.DRIVER);
  }

  @Post('drivers/me/documents/:id/review')
  @Roles(Role.DRIVER, Role.PRESTADOR)
  requestDriverDocumentReview(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.operations.requestDocumentReview(req.user.sub, Role.DRIVER, id);
  }

  @Get('suppliers/me/documents')
  @Roles(Role.SUPPLIER)
  listSupplierDocuments(@Req() req: AuthenticatedRequest) {
    return this.operations.listDocuments(req.user.sub, Role.SUPPLIER);
  }

  @Post('suppliers/me/documents/:id/review')
  @Roles(Role.SUPPLIER)
  requestSupplierDocumentReview(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.operations.requestDocumentReview(req.user.sub, Role.SUPPLIER, id);
  }

  @Get('suppliers/me/team')
  @Roles(Role.SUPPLIER)
  listCompanyTeam(@Req() req: AuthenticatedRequest) {
    return this.operations.listCompanyTeam(req.user.sub);
  }

  @Get('suppliers/me/schedule')
  @Roles(Role.SUPPLIER)
  getCompanySchedule(@Req() req: AuthenticatedRequest) {
    return this.operations.getCompanySchedule(req.user.sub);
  }

  @Patch('suppliers/me/schedule')
  @Roles(Role.SUPPLIER)
  updateCompanySchedule(@Req() req: AuthenticatedRequest, @Body() dto: UpdateSupplierScheduleDto) {
    return this.operations.updateCompanySchedule(req.user.sub, dto.schedule);
  }
}

@Controller('inventory')
export class InventoryAvailabilityController {
  constructor(private readonly operations: OperationsService) {}

  @Get('availability')
  availability(@Query() query: CoordinatesQueryDto) {
    return this.operations.getInventoryAvailability(query.latitude, query.longitude);
  }
}
