import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity'; // ✅ 1. IMPORT ET
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Product]) 
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}