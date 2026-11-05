import { apiGet, apiPatch } from '../lib/api';

export interface ProfessionalProfile {
  id: string; userId: string; fullName: string; documentNumber: string; nif?: string | null; driverLicenseNumber?: string | null;
  driverLicensePhotoUrl?: string | null; photoUrl?: string | null; vehiclePhotoUrl?: string | null; vehiclePlate?: string | null;
  vehicleType: string; vehicleCapacityKg: number; experienceYears: number; province?: string | null; municipality?: string | null;
  neighborhood?: string | null; address?: string | null; insurancePolicyNumber?: string | null; insuranceExpiresAt?: string | null;
  latitude?: number | null; longitude?: number | null; lastLocationAt?: string | null; isOnline: boolean; ratingAverage: number; acceptanceRate?: number;
  completedDeliveries: number; user?: { role: string; status: string; phone: string; email?: string | null };
}
export const fetchProfessionalProfile = () => apiGet<ProfessionalProfile>('/drivers/me/profile');
export type ProfessionalProfileUpdate = Partial<Pick<ProfessionalProfile, 'fullName' | 'documentNumber' | 'nif' | 'driverLicenseNumber' | 'vehicleType' | 'vehiclePlate' | 'vehicleCapacityKg' | 'experienceYears' | 'province' | 'municipality' | 'neighborhood' | 'address' | 'insurancePolicyNumber' | 'insuranceExpiresAt' | 'latitude' | 'longitude'>>;
export type SupplierProfileUpdate = Partial<Pick<SupplierProfile, 'legalName' | 'tradeName' | 'nif' | 'commercialRegistration' | 'activity' | 'responsibleName' | 'phoneAlt' | 'province' | 'municipality' | 'neighborhood' | 'address' | 'latitude' | 'longitude'>>;

function pickEditable<T extends object>(source: T, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = (source as Record<string, unknown>)[key];
  return out;
}

const professionalKeys = ['fullName', 'documentNumber', 'nif', 'driverLicenseNumber', 'vehicleType', 'vehiclePlate', 'vehicleCapacityKg', 'experienceYears', 'province', 'municipality', 'neighborhood', 'address', 'insurancePolicyNumber', 'insuranceExpiresAt', 'latitude', 'longitude'] as const;
const supplierKeys = ['legalName', 'tradeName', 'nif', 'commercialRegistration', 'activity', 'responsibleName', 'phoneAlt', 'province', 'municipality', 'neighborhood', 'address', 'latitude', 'longitude'] as const;

export const updateProfessionalProfile = (input: ProfessionalProfileUpdate) => apiPatch<ProfessionalProfile>('/drivers/me/profile', pickEditable(input, professionalKeys));
export const fetchSupplierProfile = () => apiGet<SupplierProfile>('/suppliers/me/profile');
export interface SupplierProfile { id: string; userId: string; legalName: string; tradeName: string; nif: string; commercialRegistration?: string|null; activity?: string|null; responsibleName: string; phoneAlt?: string|null; province?: string|null; municipality?: string|null; neighborhood?: string|null; address?: string|null; photoUrl?: string|null; latitude?: number|null; longitude?: number|null; user?: { status: string; phone: string; email?: string|null }; }
export const updateSupplierProfile = (input: SupplierProfileUpdate) => apiPatch<SupplierProfile>('/suppliers/me/profile', pickEditable(input, supplierKeys));
