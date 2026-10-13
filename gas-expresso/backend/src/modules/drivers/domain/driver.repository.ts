export interface DriverProfileInput {
  userId: string;
  fullName: string;
  documentNumber: string;
  vehicleType: string;
  vehiclePlate?: string | null;
  driverLicenseNumber?: string | null;
  nif?: string | null;
  experienceYears?: number;
  province?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiresAt?: Date | null;
  vehicleCapacityKg?: number;
}

export interface DriverProfileUpdate {
  fullName?: string;
  documentNumber?: string;
  vehicleType?: string;
  vehiclePlate?: string | null;
  driverLicenseNumber?: string | null;
  nif?: string | null;
  experienceYears?: number;
  province?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiresAt?: Date | null;
  vehicleCapacityKg?: number;
  photoUrl?: string | null;
  vehiclePhotoUrl?: string | null;
  driverLicensePhotoUrl?: string | null;
}

export abstract class DriverRepositoryPort {
  abstract create(input: DriverProfileInput): Promise<void>;
  abstract getByUserId(userId: string): Promise<any>;
  abstract updateByUserId(userId: string, input: DriverProfileUpdate): Promise<any>;
}
