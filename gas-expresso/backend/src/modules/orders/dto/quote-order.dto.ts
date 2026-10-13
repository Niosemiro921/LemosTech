import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsIn, IsLatitude, IsLongitude, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DeliveryType } from '@prisma/client';
import { OrderItemDto } from './order-item.dto';

export class QuoteOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @IsEnum(DeliveryType) deliveryType!: DeliveryType;
  @IsString() deliveryAddress!: string;
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
  /**
   * Tipo de atendimento:
   * - REFILL_EXCHANGE (troca): o cliente entrega a botija vazia e paga só o gás.
   * - NEW_CYLINDER (compra nova): inclui um cilindro novo, cobrado à parte.
   * - REFILL (recarga): apenas gás, mantendo a botija no local.
   */
  @IsOptional() @IsIn(['REFILL_EXCHANGE', 'NEW_CYLINDER', 'REFILL']) bottleExchangeType?: string;
}
