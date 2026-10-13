import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class CreateVariantDto {
  @IsString() sku!: string;
  @IsString() name!: string;
  @Type(() => Number) @IsInt() @Min(1) weightKg!: number;
  @Type(() => Number) @IsInt() @Min(0) unitPrice!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) cylinderPrice?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateProductDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateVariantDto) variants!: CreateVariantDto[];
}
