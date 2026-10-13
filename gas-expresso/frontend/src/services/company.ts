import { apiGet, apiPost, apiPatch } from '../lib/api';

export interface CompanyDocument {
  id: string;
  type: string;
  name: string;
  status: string;
  expiresAt?: string | null;
  uploadedAt?: string | null;
  reviewNote?: string | null;
}
export interface CompanyTeamMember { id: string; name: string; phone?: string; email?: string | null; role: string; status: string; }
export interface CompanySchedule { dayOfWeek: number; label: string; enabled: boolean; openTime?: string | null; closeTime?: string | null; }
export const fetchCompanyDocuments = () => apiGet<CompanyDocument[]>('/suppliers/me/documents');
export const fetchCompanyTeam = () => apiGet<CompanyTeamMember[]>('/suppliers/me/team');
export const fetchCompanySchedule = () => apiGet<CompanySchedule[]>('/suppliers/me/schedule');
export const updateCompanySchedule = (schedule: CompanySchedule[]) => apiPatch<CompanySchedule[]>('/suppliers/me/schedule', {
  // 'label' is presentation-only and is not part of UpdateScheduleDayDto.
  schedule: schedule.map(({ dayOfWeek, enabled, openTime, closeTime }) => ({ dayOfWeek, enabled, openTime, closeTime })),
});
export const requestCompanyDocumentReview = (id: string) => apiPost(`/suppliers/me/documents/${encodeURIComponent(id)}/review`);
