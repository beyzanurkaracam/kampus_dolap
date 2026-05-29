/**
 * Sentry başlatma (instrumentation).
 *
 * ÖNEMLİ: Bu dosya, uygulamadaki HER ŞEYDEN ÖNCE import edilmelidir.
 * Sebep: Sentry, OpenTelemetry tabanlı otomatik enstrümantasyon kullanır;
 * izlenecek kütüphaneler (http, express, pg, ioredis...) yüklenmeden ÖNCE
 * Sentry.init() çalışmazsa bu kütüphaneler patch edilemez ve trace toplanamaz.
 *
 * Bu yüzden main.ts'in EN ÜST satırı `import './instrument';` olmalıdır.
 */
import * as Sentry from '@sentry/nestjs';

// Sentry yalnızca SENTRY_DSN tanımlıysa devreye girer.
// Lokal geliştirmede DSN yoksa SDK sessiz kalır, hiçbir veri göndermez.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Ortam ayrımı: Sentry panelinde production/staging/development filtrelenebilir.
    environment: process.env.NODE_ENV ?? 'development',

    // Hangi sürümde hata çıktığını izlemek için (CI/CD'de SENTRY_RELEASE set edilir).
    release: process.env.SENTRY_RELEASE,

    // Performans izleme (tracing) örnekleme oranı:
    // production'da maliyet/gürültü için %10, geliştirmede tam izleme.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // PII (kişisel veri) göndermeyi kapalı tut — KVKK uyumu için kritik.
    sendDefaultPii: false,
  });
}
