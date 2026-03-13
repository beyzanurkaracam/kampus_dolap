// backend/src/modules/offer/offer.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';
import { Offer } from '../../entities/offer.entity';
import { Product } from '../../entities/product.entity';
import { ChatModule } from '../chat/chat.module'; // Chat servisini kullanmak için

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer, Product]),
    ChatModule 
  ],
  controllers: [OfferController],
  providers: [OfferService],
})
export class OfferModule {}