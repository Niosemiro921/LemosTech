import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterSupplierDto {
  @IsString()
  @MinLength(2)
  legalName!: string;

  @IsString()
  @MinLength(2)
  tradeName!: string;

  @IsString()
  @MinLength(5)
  nif!: string;

  @IsString()
  @MinLength(2)
  responsibleName!: string;

  @IsString()
  @MinLength(6)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
