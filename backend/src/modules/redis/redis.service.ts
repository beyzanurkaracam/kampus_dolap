import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    const host = process.env.REDIS_HOST || 'localhost';
    const isUpstash = host.includes('upstash.io');

    super({
      host: host,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      family: 4, // IPv4 kullanımını zorunlu kılar
      tls: isUpstash 
        ? { rejectUnauthorized: false } 
        : undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.on('connect', () => {
      console.log('✅ Redis bağlantısı başarılı');
    });

    this.on('error', (err) => {
      console.error('❌ Redis bağlantı hatası:', err);
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}