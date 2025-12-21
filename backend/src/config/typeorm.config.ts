import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../entities/user.entity';
import { Admin } from '../entities/admin.entity';
import { University } from '../entities/university.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Favorite } from '../entities/favorite.entity';
import { Chat } from '../entities/chat.entity';
import { Message } from '../entities/message.entity';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'), // ✅ FIX: Default string değeri ekle
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'beyza123',
  database: process.env.DATABASE_NAME || 'secondhand_db',
  
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
  ],
  
  migrations: ['src/migrations/*{.ts,.js}'],
  
  synchronize: false,
  logging: true,
});