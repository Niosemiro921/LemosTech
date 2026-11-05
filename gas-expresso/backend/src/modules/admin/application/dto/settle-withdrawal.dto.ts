import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SettleWithdrawalDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  paymentReference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  paymentProofUrl?: string;
}
