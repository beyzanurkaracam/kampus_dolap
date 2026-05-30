import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { RedisOptions } from 'ioredis';
/**
 * RedisIoAdapter
 *
 * Socket.io'nun Redis Adapter'ını kullanarak çoklu replica (pod)
 * arasında WebSocket mesajlarını senkronize eder.
 *
 * Sorun: 2+ replica varken User A pod-1'e, User B pod-2'ye bağlı olabilir.
 * Adapter olmadan birbirlerinin mesajlarını göremezler.
 * Bu adapter Redis pub/sub ile tüm pod'lar arasında mesaj iletir.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;

  constructor(private app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD || undefined;
    const isUpstash = host.includes('upstash.io');

    const redisOptions: RedisOptions = {
      host,
      port,
      password,
      family: 4,
      tls: isUpstash ? { rejectUnauthorized: false } : undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    };

    const pubClient = new Redis(redisOptions);
    // enableReadyCheck: false — subscriber mode'da reconnect sırasında
    // INFO komutu gönderilmez; aksi hâlde "Connection in subscriber mode" crash'i olur.
    const subClient = new Redis({ ...redisOptions, enableReadyCheck: false });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.once('ready', resolve);
        pubClient.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        subClient.once('connect', resolve);
        subClient.once('error', reject);
      }),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    console.log('Socket.io Redis Adapter bağlantısı kuruldu');
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') ?? [],
        credentials: true,
      },
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}