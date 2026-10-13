import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../../shared/domain/auth.enums';

export class LoginDto {
  @IsString()
  @MinLength(6)
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
