import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UniversityModule } from './modules/university/university.module';
import { ProductModule } from './modules/product/product.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';

// Entities
import { User } from './entities/user.entity';
import { Admin } from './entities/admin.entity';
import { University } from './entities/university.entity';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Favorite } from './entities/favorite.entity';
import { ChatModule } from './modules/chat/chat.module';
import { RedisModule } from './modules/redis/redis.module';
import { Chat } from './entities/chat.entity'; // ✅ EKLE
import { Message } from './entities/message.entity'; // ✅ EKLE
import { PaymentModule } from './modules/payment/payment.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { Offer } from './entities/offer.entity';
import { OfferModule } from './modules/offer/offer.module';
import { FollowModule } from './modules/follow/follow.module';
import { Follow } from './entities/follow.entity';
import { CampusLocation } from './entities/campus-location.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'beyza123'),
        database: configService.get('DATABASE_NAME', 'secondhand_db'),
        entities: [
          User,
          Admin,
          University,
          Category,
          Product,
          ProductImage,
          Favorite,
          Chat,
          Message,
          Offer,
          Follow,
          CampusLocation
        ], 
       
        synchronize: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),
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
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}