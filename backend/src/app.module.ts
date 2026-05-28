import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UniversityModule } from './modules/university/university.module';
import { ProductModule } from './modules/product/product.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { ChatModule } from './modules/chat/chat.module';
import { RedisModule } from './modules/redis/redis.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { OfferModule } from './modules/offer/offer.module';
import { FollowModule } from './modules/follow/follow.module';
import { CommentModule } from './modules/comment/comment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { BlockModule } from './modules/block/block.module';
import { ReviewModule } from './modules/review/review.module';

import { User } from './entities/user.entity';
import { University } from './entities/university.entity';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Favorite } from './entities/favorite.entity';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { Offer } from './entities/offer.entity';
import { Follow } from './entities/follow.entity';
import { CampusLocation } from './entities/campus-location.entity';
import { Comment } from './entities/comment.entity';
import { Notification } from './entities/notification.entity';
import { BlockedUser } from './entities/blocked-user.entity';
import { Review } from './entities/review.entity';
import { Admin } from './entities/admin.entity';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ── Config ──
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // ── Structured logging (Pino JSON) ──
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        // Hassas alanları loglardan gizle
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.password',
            'req.body.token',
            '*.password',
            '*.token',
            '*.secret',
          ],
          censor: '***REDACTED***',
        },
        // Production'da mesaj formatı
        ...(process.env.NODE_ENV === 'production' && {
          messageKey: 'message',
        }),
      },
    }),

    // ── Rate limiting ──
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 dakika
        limit: 100, // dakikada 100 istek
      },
    ]),

    // ── Database ──
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME', 'secondhand_db'),
        entities: [
          User, University, Category, Product, ProductImage,
          Favorite, Chat, Message, Offer, Follow, CampusLocation,
          Comment, Notification, BlockedUser, Review, Admin,
        ],
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),

    // ── Feature modules ──
    AuthModule,
    UniversityModule,
    ProductModule,
    AdminModule,
    UploadModule,
    ChatModule,
    PaymentModule,
    TasksModule,
    OfferModule,
    FollowModule,
    CommentModule,
    NotificationModule,
    BlockModule,
    ReviewModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}