import { Platform } from 'react-native';
import Config from 'react-native-config';

/**
 * Merkezi uygulama konfigürasyonu.
 *
 * Tüm ortam değerleri react-native-config üzerinden `.env` dosyalarından gelir.
 * Bir değer tanımsızsa (ör. Jest test ortamında native modül yüklenmediğinde),
 * geliştirme için güvenli bir varsayılana düşülür.
 *
 * Android emülatörü host makineye `10.0.2.2` üzerinden erişir;
 * iOS simülatörü ise `localhost` kullanır. Bu yüzden `.env` içinde API_URL
 * bilinçli olarak boş bırakıldığında platforma göre otomatik seçim yapılır.
 */
const devApiUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const apiUrl = Config.API_URL && Config.API_URL.length > 0 ? Config.API_URL : devApiUrl;

export const AppConfig = {
  /** REST API kök adresi (path eklenmeden). */
  API_URL: apiUrl,

  /** Socket.io kök adresi. Tanımsızsa API_URL ile aynı host kullanılır. */
  SOCKET_URL:
    Config.SOCKET_URL && Config.SOCKET_URL.length > 0 ? Config.SOCKET_URL : apiUrl,

  /** Sentry DSN. Boşsa Sentry devre dışı kalır. */
  SENTRY_DSN: Config.SENTRY_DSN ?? '',

  /** Çalışma ortamı: development | production */
  ENVIRONMENT: Config.ENVIRONMENT ?? 'development',
} as const;
