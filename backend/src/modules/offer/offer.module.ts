import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';
import { Offer } from '../../entities/offer.entity';
import { Product } from '../../entities/product.entity';
import { Chat } from '../../entities/chat.entity';
import { ChatModule } from '../chat/chat.module';
import { BlockModule } from '../block/block.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer, Product, Chat]),
    forwardRef(() => ChatModule),
    forwardRef(() => BlockModule),
    NotificationModule,
  ],
  controllers: [OfferController],
  providers: [OfferService],
  exports: [OfferService],
})
export class OfferModule {}
