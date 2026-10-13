import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, IsUUID } from 'class-validator';
import { SupplierCustomerInteractionType, SupplierInvoiceStatus, SupplierInvoiceType, SupplierLotStatus } from '@prisma/client';

export class CreateLotDto {
  @IsString() @MinLength(2) @MaxLength(60) code!: string;
  @IsDateString() productionAt!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) quantity!: number;
  @IsOptional() @IsEnum(SupplierLotStatus) status?: SupplierLotStatus;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateLotDto {
  @IsOptional() @IsDateString() productionAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) quantity?: number;
  @IsOptional() @IsEnum(SupplierLotStatus) status?: SupplierLotStatus;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
}

export class CreateInvoiceDto {
  @IsString() @MinLength(1) @MaxLength(60) number!: string;
  @IsEnum(SupplierInvoiceType) type!: SupplierInvoiceType;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000000) amount!: number;
  @IsDateString() issueDate!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsEnum(SupplierInvoiceStatus) status?: SupplierInvoiceStatus;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class CreateInteractionDto {
  @IsUUID() customerId!: string;
  @IsEnum(SupplierCustomerInteractionType) type!: SupplierCustomerInteractionType;
  @IsString() @MinLength(2) @MaxLength(160) subject!: string;
  @IsString() @MinLength(1) @MaxLength(5000) message!: string;
  @IsOptional() @IsDateString() nextActionAt?: string;
}
