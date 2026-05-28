import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { RedisService } from '../modules/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redisService: RedisService,
  ) {}

  /**
   * GET /api/health
   * Genel sağlık durumu — DB + Redis
   */
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
    ]);
  }

  /**
   * GET /api/health/live
   * Liveness probe — uygulama ayakta mı?
   * K8s livenessProbe buna bakar. Basit 200 dönmesi yeterli.
   */
  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * GET /api/health/ready
   * Readiness probe — trafik almaya hazır mı?
   * K8s readinessProbe buna bakar. DB + Redis bağlı olmalı.
   */
  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
    ]);
  }

  /**
   * Redis'e PING atarak sağlık kontrolü yapar.
   */
  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const result = await this.redisService.ping();
      if (result === 'PONG') {
        return { redis: { status: 'up' } };
      }
      return { redis: { status: 'down', message: `Unexpected response: ${result}` } };
    } catch (error) {
      return { redis: { status: 'down', message: error.message } };
    }
  }
}