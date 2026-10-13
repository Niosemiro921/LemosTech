import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiateCallDto {
  @IsString()
  @IsNotEmpty()
  sdpOffer!: string;
}

export class AnswerCallDto {
  @IsString()
  @IsNotEmpty()
  sdpAnswer!: string;
}

export class IceCandidateDto {
  @IsNotEmpty()
  candidate!: unknown;
}

export class EndCallDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
