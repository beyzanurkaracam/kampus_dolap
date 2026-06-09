import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Product } from 'src/entities/product.entity';
import { User } from '../../entities/user.entity';
import { Offer } from '../../entities/offer.entity';
import { Chat } from '../../entities/chat.entity';
import { Category } from '../../entities/category.entity';
import { University } from '../../entities/university.entity';
import { CampusLocation } from '../../entities/campus-location.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Product, Offer, Chat, Category, University, CampusLocation]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
