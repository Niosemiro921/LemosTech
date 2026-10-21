import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

export enum AnalyticsEventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
}

export enum AnalyticsArea {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
  SUPPLIER = 'SUPPLIER',
  ADMIN = 'ADMIN',
  PUBLIC = 'PUBLIC',
}

export class AnalyticsEventDto {
  @IsString() @MaxLength(100) sessionId!: string;
  @IsEnum(AnalyticsEventType) eventType!: AnalyticsEventType;
  @IsEnum(AnalyticsArea) area!: AnalyticsArea;
  @IsString() @MaxLength(255) path!: string;
  @IsOptional() @IsString() @MaxLength(100) target?: string;
}