import { IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

/**
 * O Prestador é uma empresa parceira que opera entregas.
 * No registo pede-se apenas a identificação da empresa e do responsável;
 * os dados operacionais (veículo, documentos) podem ser completados depois no perfil.
 */
export class RegisterPrestadorDto {
  // Responsável pela empresa (também usado no perfil operacional)
  @IsString() @MinLength(2) fullName!: string;
  @IsString() @MinLength(6) phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(10) password!: string;

  // Dados da empresa (obrigatórios)
  @IsString() @MinLength(2) legalName!: string;
  @IsString() @MinLength(2) tradeName!: string;
  @IsString() @MinLength(5) nif!: string;
  @IsOptional() @IsString() commercialRegistration?: string;
  @IsOptional() @IsString() activity?: string;

  // Localização da empresa
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() municipality?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() address?: string;

  // Operação (opcional: pode ser completado depois em "Meu perfil")
  @IsOptional() @IsString() vehicleType?: string;
  @IsOptional() @IsString() vehiclePlate?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) experienceYears?: number;
  @IsOptional() @IsInt() @Min(1) @Max(500) vehicleCapacityKg?: number;
}
