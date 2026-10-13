import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterSupplierDto {
  @IsString() @MinLength(2) legalName!: string;
  @IsString() @MinLength(2) tradeName!: string;
  @IsString() @MinLength(5) nif!: string;
  @IsOptional() @IsString() commercialRegistration?: string;
  @IsOptional() @IsString() activity?: string;
  @IsString() @MinLength(2) responsibleName!: string;
  @IsString() @MinLength(6) phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(10) password!: string;
  @IsOptional() @IsString() phoneAlt?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() municipality?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() address?: string;
}
