import { IsBoolean, IsOptional } from 'class-validator';
import { QuoteOrderDto } from './quote-order.dto';

export class CreateOrderDto extends QuoteOrderDto {
  @IsOptional() @IsBoolean() acceptEstimatedPrice?: boolean;
}
