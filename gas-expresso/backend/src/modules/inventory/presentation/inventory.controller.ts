import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../../shared/domain/auth.enums';
import { InventoryService } from '../application/inventory.service';
import { UpsertInventoryDto } from '../dto/upsert-inventory.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';

@Controller('suppliers/me')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
@Roles(Role.SUPPLIER)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get('location') locationInfo(@Req() req: Request & { user: { sub: string } }) { return this.inventory.getLocation(req.user.sub); }
  @Get('inventory') list(@Req() req: Request & { user: { sub: string } }) { return this.inventory.getSupplierInventory(req.user.sub); }
  @Patch('inventory') upsert(@Req() req: Request & { user: { sub: string } }, @Body() dto: UpsertInventoryDto) { return this.inventory.upsert(req.user.sub, dto.variantId, dto.availableQty, dto.reorderLevel ?? 5, dto.note); }
  @Patch('location') location(@Req() req: Request & { user: { sub: string } }, @Body() dto: UpdateLocationDto) { return this.inventory.setLocation(req.user.sub, dto.latitude, dto.longitude); }
}
