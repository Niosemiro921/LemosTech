import { apiPost } from '../lib/api';

async function upload(path: string, file: File) {
  const form = new FormData(); form.append('file', file); return apiPost(path, form);
}
export const uploadProfessionalPhoto = (file: File) => upload('/media/drivers/me/photo', file);
export const uploadVehiclePhoto = (file: File) => upload('/media/drivers/me/vehicle-photo', file);
export const uploadLicensePhoto = (file: File) => upload('/media/drivers/me/license-photo', file);
export const uploadSupplierPhoto = (file: File) => upload('/media/suppliers/me/photo', file);
