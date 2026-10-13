import { BadRequestException, Controller, Post, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Role } from '../../shared/domain/auth.enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { DriverRepositoryPort } from '../drivers/domain/driver.repository';
import { SupplierRepositoryPort } from '../suppliers/domain/supplier.repository';
import { MediaService } from './media.service';

interface UploadedFilePayload {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly media: MediaService, private readonly drivers: DriverRepositoryPort, private readonly suppliers: SupplierRepositoryPort) {}

  @Post('drivers/me/photo')
  @Roles(Role.DRIVER, Role.PRESTADOR)
  @UseInterceptors(FileInterceptor('file'))
  async driverPhoto(@Req() req: Request & { user: { sub: string } }, @UploadedFile() file?: UploadedFilePayload) {
    if (!file) throw new BadRequestException('Selecione uma fotografia.');
    const saved = await this.media.storeImage(file, 'driver');
    return this.drivers.updateByUserId(req.user.sub, { photoUrl: saved.url });
  }

  @Post('drivers/me/vehicle-photo')
  @Roles(Role.DRIVER, Role.PRESTADOR)
  @UseInterceptors(FileInterceptor('file'))
  async vehiclePhoto(@Req() req: Request & { user: { sub: string } }, @UploadedFile() file?: UploadedFilePayload) {
    if (!file) throw new BadRequestException('Selecione uma fotografia do veículo.');
    const saved = await this.media.storeImage(file, 'vehicle');
    return this.drivers.updateByUserId(req.user.sub, { vehiclePhotoUrl: saved.url });
  }

  @Post('drivers/me/license-photo')
  @Roles(Role.DRIVER, Role.PRESTADOR)
  @UseInterceptors(FileInterceptor('file'))
  async licensePhoto(@Req() req: Request & { user: { sub: string } }, @UploadedFile() file?: UploadedFilePayload) {
    if (!file) throw new BadRequestException('Selecione a fotografia da carteira de motorista.');
    const saved = await this.media.storeImage(file, 'license');
    return this.drivers.updateByUserId(req.user.sub, { driverLicensePhotoUrl: saved.url });
  }

  @Post('suppliers/me/photo')
  @Roles(Role.SUPPLIER)
  @UseInterceptors(FileInterceptor('file'))
  async supplierPhoto(@Req() req: Request & { user: { sub: string } }, @UploadedFile() file?: UploadedFilePayload) {
    if (!file) throw new BadRequestException('Selecione o logótipo ou fotografia da empresa.');
    const saved = await this.media.storeImage(file, 'supplier');
    return this.suppliers.updateByUserId(req.user.sub, { photoUrl: saved.url });
  }
}
