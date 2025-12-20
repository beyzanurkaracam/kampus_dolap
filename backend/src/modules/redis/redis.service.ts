import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    super({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
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