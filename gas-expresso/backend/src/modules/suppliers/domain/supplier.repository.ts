export interface SupplierProfileInput {
  userId: string;
  legalName: string;
  tradeName: string;
  nif: string;
  responsibleName: string;
  commercialRegistration?: string | null;
  activity?: string | null;
  phoneAlt?: string | null;
  province?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  address?: string | null;
}

export interface SupplierProfileUpdate {
  legalName?: string;
  tradeName?: string;
  nif?: string;
  responsibleName?: string;
  commercialRegistration?: string | null;
  activity?: string | null;
  phoneAlt?: string | null;
  province?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export abstract class SupplierRepositoryPort {
  abstract create(input: SupplierProfileInput): Promise<void>;
  abstract getByUserId(userId: string): Promise<any>;
  abstract updateByUserId(userId: string, input: SupplierProfileUpdate): Promise<any>;
}
