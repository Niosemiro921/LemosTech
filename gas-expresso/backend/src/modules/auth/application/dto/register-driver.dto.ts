import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(6)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(5)
  password!: string;

  @IsString()
  @MinLength(4)
  documentNumber!: string;

  @IsString()
  @MinLength(2)
  vehicleType!: string;
}
