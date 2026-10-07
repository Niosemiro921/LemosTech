import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateAddressDto {
  @IsString() @MinLength(1) @MaxLength(40) label!: string;
  @IsString() @MinLength(3) @MaxLength(300) address!: string;
  @IsOptional() @IsString() @MaxLength(300) reference?: string | null;
  @IsOptional() @IsString() @MaxLength(100) municipality?: string | null;
  @IsOptional() @IsString() @MaxLength(100) province?: string | null;
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number | null;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number | null;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) label?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(300) reference?: string | null;
  @IsOptional() @IsString() @MaxLength(100) municipality?: string | null;
  @IsOptional() @IsString() @MaxLength(100) province?: string | null;
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number | null;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number | null;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CreateSupportTicketDto {
  @IsString() @MinLength(1) @MaxLength(60) category!: string;
  @IsString() @MinLength(3) @MaxLength(160) subject!: string;
  @IsString() @MinLength(10) @MaxLength(5000) message!: string;
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateIncidentDto {
  @IsString() @MinLength(2) @MaxLength(60) category!: string;
  @IsEnum(IncidentSeverity) severity!: IncidentSeverity;
  @IsString() @MinLength(10) @MaxLength(5000) description!: string;
  @IsOptional() @IsUUID() orderId?: string;
}

export class UpdateScheduleDayDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(6) dayOfWeek!: number;
  @IsBoolean() enabled!: boolean;
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) openTime?: string | null;
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) closeTime?: string | null;
}

export class UpdateSupplierScheduleDto {
  @IsArray() @ArrayMinSize(7) @ArrayMaxSize(7)
  @ValidateNested({ each: true }) @Type(() => UpdateScheduleDayDto)
  schedule!: UpdateScheduleDayDto[];
}

export class RequestWalletTopUpDto {
  @Type(() => Number) @IsInt() @Min(1000) @Max(1000000) amount!: number;
}

export class WalletTopUpDecisionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CoordinatesQueryDto {
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
}
