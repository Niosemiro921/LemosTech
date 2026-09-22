import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertInventoryDto {
  @IsString() variantId!: string;
  @Type(() => Number) @IsInt() @Min(0) availableQty!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) reorderLevel?: number;
  @IsOptional() @IsString() note?: string;
}
