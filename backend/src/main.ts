import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { RedisIoAdapter } from './modules/chat/redis-io.adapter';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ── Pino structured logger ──
  app.useLogger(app.get(Logger));

  // ── Security headers ──
  app.use(helmet());

  // ── Global prefix ──
  app.setGlobalPrefix('api');

  // ── CORS (env'den alır, yoksa boş array → hiçbir origin kabul etmez) ──
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Validation pipe ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // DTO'da tanımlı olmayan alanları siler
      forbidNonWhitelisted: true, // Tanımsız alan gönderilirse 400 fırlatır
      transform: true,           // Gelen değerleri DTO tipine dönüştürür
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  // ── Graceful shutdown (SIGTERM handling) ──
  app.enableShutdownHooks();

  // ── Socket.io Redis Adapter (çoklu replica arası mesaj sync) ──
  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  // ── Start ──
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // Pino logger kullanıldığı için console.log yerine logger:
  const logger = app.get(Logger);
  logger.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
}

bootstrap();