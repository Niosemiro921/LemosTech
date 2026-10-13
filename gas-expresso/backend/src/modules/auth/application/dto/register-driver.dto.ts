import { IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsString() @MinLength(6) phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(10) password!: string;
  @IsString() @MinLength(4) documentNumber!: string;
  @IsString() @MinLength(2) vehicleType!: string;
  @IsOptional() @IsString() vehiclePlate?: string;
  @IsOptional() @IsString() driverLicenseNumber?: string;
  @IsOptional() @IsString() nif?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) experienceYears?: number;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() municipality?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() insurancePolicyNumber?: string;
  @IsOptional() insuranceExpiresAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(500) vehicleCapacityKg?: number;
}
