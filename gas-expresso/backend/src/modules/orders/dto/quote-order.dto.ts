import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DeliveryType } from '@prisma/client';
import { OrderItemDto } from './order-item.dto';

export class QuoteOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @IsEnum(DeliveryType) deliveryType!: DeliveryType;
  @IsString() deliveryAddress!: string;
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
}
