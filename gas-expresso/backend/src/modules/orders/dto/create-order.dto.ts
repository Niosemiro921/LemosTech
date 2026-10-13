import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QuoteOrderDto } from './quote-order.dto';

export class CreateOrderDto extends QuoteOrderDto {
  @IsOptional() @IsBoolean() acceptEstimatedPrice?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) changeForAmount?: number;
  @IsOptional() @IsString() bottleBrand?: string;
  @IsOptional() @IsString() valveType?: string;
  @IsOptional() @IsString() deliveryNotes?: string;
}

