import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Product]),
    NotificationModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
