import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(6)
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
