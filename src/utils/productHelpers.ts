import { Platform } from 'react-native';
import { AppConfig } from '../config/env';

// S3 origin'inden gelen (eski DB kayıtları dahil) tüm görselleri Cloudflare CDN'e yönlendir.
// Böylece DB migration olmadan eski görseller de edge cache'ten servis edilir.
const S3_HOST = 'kampusumden.s3.eu-north-1.amazonaws.com';
const CDN_HOST = 'cdn.kampusumden.online';

/**
 * Bir görsel URL'ini mevcut çalışma ortamına göre güvenli ve yüklenebilir bir
 * adrese dönüştürür.
 *
 * Çözdüğü sorunlar:
 *  - S3 origin'i Cloudflare CDN host'una çevrilir (edge cache + düşük gecikme).
 *  - S3 / harici tam URL'ler (amazonaws.com vb.) olduğu gibi kullanılır.
 *  - Backend'e ait görseller (ör. dev'de kaydedilmiş
 *    "http://localhost:3000/upload/proxy/...") MEVCUT API köküne göre yeniden
 *    kurulur. Böylece eksik "/api" prefix'i veya yanlış host (localhost) gibi
 *    nedenlerle bozulan eski/legacy URL'ler her ortamda otomatik düzelir.
 *  - Android emülatöründe host makineye "10.0.2.2" üzerinden erişilir.
 */
export const getImageUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  // Eski/yeni S3 URL'lerini CDN'e çevir (host bazlı, http/https fark etmez)
  const trimmed = url.trim().split(S3_HOST).join(CDN_HOST);
  if (!trimmed) return undefined;

  const isAbsolute = /^https?:\/\//i.test(trimmed);
  // Backend'in kendi upload/proxy görselleri (S3 direct URL'leri /upload/ içermez)
  const isBackendUpload = trimmed.includes('/upload/');

  let result: string;
  if (isAbsolute && !isBackendUpload) {
    // Harici tam URL (S3 / CDN) → dokunma
    result = trimmed;
  } else {
    // Backend görseli (mutlak ya da göreli) → mevcut API köküne göre yeniden kur
    const apiBase = AppConfig.API_URL.replace(/\/+$/, '');
    let path = trimmed;
    const schemeMatch = trimmed.match(/^https?:\/\/[^/]+(\/.*)$/i);
    if (schemeMatch) path = schemeMatch[1];
    // apiBase zaten "/api" içerebileceğinden path'teki baştaki "/api"yi tekilleştir
    path = path.replace(/^\/api(?=\/|$)/, '');
    if (!path.startsWith('/')) path = `/${path}`;
    result = `${apiBase}${path}`;
  }

  if (Platform.OS === 'android') {
    result = result.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return result;
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
