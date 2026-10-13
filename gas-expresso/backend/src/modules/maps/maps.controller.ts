import { Controller, Get, Query } from '@nestjs/common';
import { MapsService } from './maps.service';

@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('geocode')
  async geocode(@Query('address') address: string) {
    return this.mapsService.geocodeAddress(address);
  }

  @Get('route')
  async route(
    @Query('startLat') startLat: number,
    @Query('startLng') startLng: number,
    @Query('endLat') endLat: number,
    @Query('endLng') endLng: number,
  ) {
    return this.mapsService.calculateRoute(
      { lat: Number(startLat), lng: Number(startLng) },
      { lat: Number(endLat), lng: Number(endLng) },
    );
  }
}
