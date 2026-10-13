import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateDriverProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @IsString() nif?: string | null;
  @IsOptional() @IsString() driverLicenseNumber?: string | null;
  @IsOptional() @IsString() vehicleType?: string;
  @IsOptional() @IsString() vehiclePlate?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(50) experienceYears?: number;
  @IsOptional() @IsInt() @Min(1) @Max(500) vehicleCapacityKg?: number;
  @IsOptional() @IsString() province?: string | null;
  @IsOptional() @IsString() municipality?: string | null;
  @IsOptional() @IsString() neighborhood?: string | null;
  @IsOptional() @IsString() address?: string | null;
  @IsOptional() @IsString() insurancePolicyNumber?: string | null;
  @IsOptional() @IsString() insuranceExpiresAt?: string | null;
  @IsOptional() @IsLatitude() latitude?: number | null;
  @IsOptional() @IsLongitude() longitude?: number | null;
}
