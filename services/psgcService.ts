import { api } from '../lib/apiClient';

export const NCR_CODE = '1300000000';
export const NCR_LABEL = 'National Capital Region (NCR)';

export type ProvinceOption = {
  code: string;
  name: string;
};

export type CityOption = {
  code: string;
  name: string;
};

export type BarangayOption = {
  code: string;
  name: string;
};

export const FALLBACK_PROVINCES: ProvinceOption[] = [
  { code: NCR_CODE, name: NCR_LABEL },
  { code: '0402100000', name: 'Cavite' },
  { code: '0702200000', name: 'Cebu' },
  { code: '1102400000', name: 'Davao del Sur' },
  { code: '0300800000', name: 'Bulacan' },
  { code: '0403400000', name: 'Laguna' },
  { code: '0405800000', name: 'Rizal' },
];

export async function fetchProvinces(): Promise<ProvinceOption[]> {
  try {
    return await api.get<ProvinceOption[]>('/locations/provinces');
  } catch {
    return FALLBACK_PROVINCES;
  }
}

export async function fetchCities(provinceCode: string): Promise<CityOption[]> {
  try {
    return await api.get<CityOption[]>(`/locations/provinces/${provinceCode}/cities`);
  } catch {
    return [];
  }
}

export async function fetchBarangays(cityCode: string): Promise<BarangayOption[]> {
  try {
    return await api.get<BarangayOption[]>(`/locations/cities/${cityCode}/barangays`);
  } catch {
    return [];
  }
}
