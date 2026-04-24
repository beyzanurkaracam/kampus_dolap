// backend/src/modules/notification/notification.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService], // Diğer modüller (Comment, Offer vs.) kullanabilsin
})
export class NotificationModule {}
