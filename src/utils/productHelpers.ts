import { Platform } from 'react-native';

export const getImageUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (Platform.OS === 'android' && url.includes('localhost')) {
    return url.replace('localhost', '10.0.2.2');
  }
  return url;
};

export const CONDITION_LABELS: Record<string, string> = {
  new: 'Sıfır',
  like_new: 'Sıfır Gibi',
  good: 'İyi',
  fair: 'Orta',
  poor: 'Eski',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  sold: 'Satıldı',
  inactive: 'Pasif',
  pending: 'Onay Bekliyor',
  reserved: 'Rezerve',
};
