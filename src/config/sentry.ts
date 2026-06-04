import * as Sentry from '@sentry/react-native';
import { AppConfig } from './env';

/**
 * Sentry'i (mobil hata & performans izleme) başlatır.
 *
 * DSN tanımlı değilse hiçbir şey yapmaz — böylece lokal geliştirmede
 * Sentry'e veri gönderilmez ve gereksiz gürültü oluşmaz.
 *
 * App.tsx içinde, uygulama render edilmeden ÖNCE çağrılır.
 */
export function initSentry(): void {
  if (!AppConfig.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: AppConfig.SENTRY_DSN,
    environment: AppConfig.ENVIRONMENT,

    // Performans izleme örnekleme oranı: production'da %20, geliştirmede tam.
    tracesSampleRate: AppConfig.ENVIRONMENT === 'production' ? 0.2 : 1.0,

    // KVKK: kullanıcı IP/cihaz gibi kişisel verileri otomatik gönderme.
    sendDefaultPii: false,
  });
}
