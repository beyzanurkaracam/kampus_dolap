import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from 'src/entities/user.entity';
import { Product } from 'src/entities/product.entity';
import { Admin } from 'src/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Admin])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
