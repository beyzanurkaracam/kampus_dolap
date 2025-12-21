import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Repository, LessThan, In } from 'typeorm';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // Runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePremiumExpiration() {
    this.logger.debug('Checking for expired premium memberships...');

    const now = new Date();

    // 1. Find users whose premium has expired AND are still marked as premium
    const expiredUsers = await this.userRepository.find({
      where: {
        isPremium: true,
        premiumExpiresAt: LessThan(now),
      },
    });

    if (expiredUsers.length === 0) {
        this.logger.debug('No expired memberships found.');
        return;
    }

    this.logger.debug(`Found ${expiredUsers.length} users with expired premium.`);

    // 2. Process each expired user
    for (const user of expiredUsers) {
      // Downgrade user
      user.isPremium = false;
      user.premiumExpiresAt = null; // or keep the date for history
      await this.userRepository.save(user);

      this.logger.log(`Downgraded user ${user.id} (${user.email}) to free plan.`);

      // 3. Check their product count
      const activeProducts = await this.productRepository.find({
        where: {
          sellerId: user.id,
          status: In(['active', 'pending']), // Check active and pending
        },
        order: { createdAt: 'DESC' }, // Keep the newest ones
      });

      const LIMIT = 3;

      if (activeProducts.length > LIMIT) {
        // Identify products to deactivate (keep the first 3)
        const productsToDeactivate = activeProducts.slice(LIMIT);

        for (const product of productsToDeactivate) {
          product.status = 'inactive'; // Or a specific status like 'suspended'
          await this.productRepository.save(product);
        }

        this.logger.log(`Deactivated ${productsToDeactivate.length} products for user ${user.id} due to limit.`);
      }
    }
  }
}