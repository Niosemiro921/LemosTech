import { apiGet, apiPost } from '../lib/api';

export interface Incident {
  id: string;
  reference: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}
export const fetchMyIncidents = () => apiGet<Incident[]>('/incidents/mine');
export const createIncident = (input: { category: string; severity: string; description: string; orderId?: string }) => apiPost<Incident>('/incidents', input);
