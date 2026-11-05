import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveAccountGuard } from '../../auth/guards/active-account.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '../../../shared/domain/auth.enums';
import { DriverService } from '../application/driver.service';
import {
  DriverGetOffersDto,
  DriverAcceptOfferDto,
  DriverRejectOfferDto,
  DriverToggleStatusDto,
  DriverLocationDto,
  DriverWalletGetTransactionsDto,
  DriverWalletTopUpDto,
} from './drivers.dto';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard, ActiveAccountGuard)
export class DriversController {
  constructor(private readonly drivers: DriverService) {}

  @Get('me/offers')
  @Roles(Role.DRIVER)
  getMyOffers(
    @Req() req: Request & { user: { sub: string } },
    @Query() query?: DriverGetOffersDto,
  ) {
    return this.drivers.getMyOffers(req.user.sub, query);
  }

  @Post('me/offers/:offerId/accept')
  @Roles(Role.DRIVER)
  acceptOffer(
    @Req() req: Request & { user: { sub: string } },
    @Param('offerId') offerId: string,
  ) {
    return this.drivers.acceptOffer(req.user.sub, offerId);
  }

  @Post('me/offers/:offerId/reject')
  @Roles(Role.DRIVER)
  rejectOffer(
    @Req() req: Request & { user: { sub: string } },
    @Param('offerId') offerId: string,
  ) {
    return this.drivers.rejectOffer(req.user.sub, offerId);
  }

  @Post('me/online')
  @Roles(Role.DRIVER)
  goOnline(
    @Req() req: Request & { user: { sub: string } },
    @Body() body: DriverToggleStatusDto,
  ) {
    return this.drivers.setOnlineStatus(req.user.sub, body.isOnline ?? true);
  }

  @Post('me/offline')
  @Roles(Role.DRIVER)
  goOffline(
    @Req() req: Request & { user: { sub: string } },
    @Body() body?: DriverToggleStatusDto,
  ) {
    return this.drivers.setOnlineStatus(req.user.sub, false);
  }

  @Post('me/location')
  @Roles(Role.DRIVER)
  updateLocation(
    @Req() req: Request & { user: { sub: string } },
    @Body() body: DriverLocationDto,
  ) {
    return this.drivers.updateLocation(req.user.sub, body);
  }

}
