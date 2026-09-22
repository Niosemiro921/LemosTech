import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class DriverActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
