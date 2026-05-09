import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Repository, LessThan, In } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../entities/notification.entity';

const RESERVED_REMINDER_DAYS = 3;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private notificationService: NotificationService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // 3 günden fazla rezerve kalan ürünler için satıcıya tek seferlik
  // "Bu ürünü sattınız mı?" hatırlatması.
  // ─────────────────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async remindLongReserved() {
    const threshold = new Date(Date.now() - RESERVED_REMINDER_DAYS * 24 * 60 * 60 * 1000);

    const stale = await this.productRepository.find({
      where: {
        status: 'reserved',
        reservedReminderSent: false,
        reservedAt: LessThan(threshold),
      },
    });

    if (stale.length === 0) return;
    this.logger.debug(`Found ${stale.length} stale reserved products.`);

    for (const product of stale) {
      await this.notificationService.createNotification({
        recipientId: product.sellerId,
        type: NotificationType.SYSTEM,
        title: 'Hala satışta mı?',
        message: `"${product.title}" 3 günden uzun süredir rezerve. Sattıysanız ürünü satıldı olarak işaretleyin.`,
        referenceId: product.id,
        referenceType: 'product',
      });
      product.reservedReminderSent = true;
      await this.productRepository.save(product);
    }
  }

  // (Mevcut) Premium üyelik bitişlerini her gece kontrol et.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePremiumExpiration() {
    this.logger.debug('Checking for expired premium memberships...');
    const now = new Date();

    const expiredUsers = await this.userRepository.find({
      where: { isPremium: true, premiumExpiresAt: LessThan(now) },
    });
    if (expiredUsers.length === 0) return;

    for (const user of expiredUsers) {
      user.isPremium = false;
      user.premiumExpiresAt = null;
      await this.userRepository.save(user);

      const activeProducts = await this.productRepository.find({
        where: { sellerId: user.id, status: In(['active', 'pending']) },
        order: { createdAt: 'DESC' },
      });

      const LIMIT = 3;
      if (activeProducts.length > LIMIT) {
        for (const p of activeProducts.slice(LIMIT)) {
          p.status = 'removed';
          await this.productRepository.save(p);
        }
      }
    }
  }
}
