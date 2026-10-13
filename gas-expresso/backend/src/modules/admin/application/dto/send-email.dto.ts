import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendEmailDto {
  @IsOptional() @IsEmail() to?: string;
  @IsOptional() @IsString() @MinLength(1) userId?: string;
  @IsString() @MinLength(3) @MaxLength(180) subject!: string;
  @IsString() @MinLength(3) @MaxLength(10000) message!: string;
}
