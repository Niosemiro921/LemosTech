import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class UpdateSupplierProfileDto {
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() tradeName?: string;
  @IsOptional() @IsString() nif?: string;
  @IsOptional() @IsString() commercialRegistration?: string | null;
  @IsOptional() @IsString() activity?: string | null;
  @IsOptional() @IsString() responsibleName?: string;
  @IsOptional() @IsString() phoneAlt?: string | null;
  @IsOptional() @IsString() province?: string | null;
  @IsOptional() @IsString() municipality?: string | null;
  @IsOptional() @IsString() neighborhood?: string | null;
  @IsOptional() @IsString() address?: string | null;
  @IsOptional() @IsLatitude() latitude?: number | null;
  @IsOptional() @IsLongitude() longitude?: number | null;
}
