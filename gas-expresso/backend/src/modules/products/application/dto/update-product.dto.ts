import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateVariantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) unitPrice?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
