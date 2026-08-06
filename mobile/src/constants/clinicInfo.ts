import type { ImageSourcePropType } from 'react-native';
import { logoSource } from '../assets/brandAssets';

/**
 * Dados da clínica ativa no app.
 * Charme & Bela: constante local.
 * SaaS: trocar por fetch da API + seleção multi-clínica (mesmo shape).
 */
export interface ClinicInfo {
  id: string;
  name: string;
  logo: ImageSourcePropType;
  addressLine1: string;
  addressLine2: string;
  cityState: string;
  latitude: number;
  longitude: number;
  whatsappE164: string;
  whatsappDisplay: string;
  instagramHandle: string;
  instagramUrl: string;
  websiteUrl: string;
  contactEmail: string;
  googleBusinessUrl: string;
}

export const ACTIVE_CLINIC: ClinicInfo = {
  id: 'charme-bela',
  name: 'Charme & Bela',
  logo: logoSource,
  addressLine1: 'Av. Paranaguá, 1672',
  addressLine2: 'Ermelino Matarazzo',
  cityState: 'São Paulo - SP',
  // Aprox. Av. Paranaguá, Ermelino Matarazzo
  latitude: -23.4935,
  longitude: -46.4748,
  whatsappE164: '5511913129669',
  whatsappDisplay: '(11) 91312-9669',
  instagramHandle: '@espacocharmebela',
  instagramUrl: 'https://www.instagram.com/espacocharmebela/',
  websiteUrl: 'https://www.charmebela.com.br/',
  contactEmail: 'contato@charmeebela.com',
  googleBusinessUrl: 'https://share.google/sK3BaUJYV5qZXoiXg',
};

export function clinicWazeUrl(clinic: ClinicInfo = ACTIVE_CLINIC): string {
  return `https://waze.com/ul?ll=${clinic.latitude},${clinic.longitude}&navigate=yes`;
}

export function clinicMapsUrl(clinic: ClinicInfo = ACTIVE_CLINIC): string {
  return clinic.googleBusinessUrl;
}
