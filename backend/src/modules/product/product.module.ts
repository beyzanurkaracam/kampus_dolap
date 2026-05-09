import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from 'src/entities/product.entity';
import { ProductImage } from 'src/entities/product-image.entity';
import { Category } from 'src/entities/category.entity';
import { Favorite } from 'src/entities/favorite.entity';
import { User } from 'src/entities/user.entity';
import { Offer } from 'src/entities/offer.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, Category, Favorite, User, Offer]),
    NotificationModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
