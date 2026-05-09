import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedUser } from '../../entities/blocked-user.entity';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { OfferModule } from '../offer/offer.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockedUser]),
    forwardRef(() => OfferModule),
    forwardRef(() => ChatModule),
  ],
  providers: [BlockService],
  controllers: [BlockController],
  exports: [BlockService],
})
export class BlockModule {}
