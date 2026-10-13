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
export const updateProfessionalProfile = (input: Partial<ProfessionalProfile>) => apiPatch<ProfessionalProfile>('/drivers/me/profile', input);
