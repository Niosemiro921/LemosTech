import { Type } from 'class-transformer';
import { BillingCycle, SubscriptionInvoiceStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSubscriptionInvoiceDto {
  @IsUUID() planId!: string;
  @IsEnum(BillingCycle) billingCycle!: BillingCycle;
}

export class SubmitInvoiceProofDto {
  @IsString() @MinLength(3) @MaxLength(2000) proofUrl!: string;
  @IsOptional() @IsString() @MaxLength(500) proofNote?: string;
}

export class CreateBillingPlanDto {
  @IsString() @MinLength(2) @MaxLength(40) code!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000000000) priceMonthly!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000000000) priceYearly!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) maxBranches?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) maxUsers?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateBillingPlanDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000000) priceMonthly?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000000) priceYearly?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) maxBranches?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) maxUsers?: number | null;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class RejectSubscriptionInvoiceDto {
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class ReviewSubscriptionInvoiceDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ListAdminInvoicesDto {
  @IsOptional() @IsEnum(SubscriptionInvoiceStatus) status?: SubscriptionInvoiceStatus;
}

export class UpdateSubscriptionStatusDto {
  @IsString() @MinLength(6) @MaxLength(20) action!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
