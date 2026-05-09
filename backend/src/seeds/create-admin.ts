import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Category } from '../entities/category.entity';
import { CampusLocation } from '../entities/campus-location.entity';
import { Follow } from '../entities/follow.entity';

const [email, password, fullName = 'Platform Admin'] = process.argv.slice(2);

if (!email || !password) {
  console.error('Kullanım: npm run seed:admin -- <email> <şifre> [ad soyad]');
  process.exit(1);
}

async function run() {
  require('dotenv').config({ path: `${__dirname}/../../.env` });

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432'),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'beyza123',
    database: process.env.DATABASE_NAME || 'secondhand_db',
    entities: [User, University, Product, ProductImage, Category, CampusLocation, Follow],
    synchronize: false,
  });

  await ds.initialize();
  const repo = ds.getRepository(User);

  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log(`Bu email zaten kayıtlı: ${email}`);
    await ds.destroy();
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = repo.create({
    email,
    password: hashed,
    fullName,
    role: 'ADMIN',
    emailVerified: true,
    isActive: true,
    universityId: null,
  });

  await repo.save(admin);
  console.log(`Admin oluşturuldu: ${email} (${fullName})`);
  await ds.destroy();
}

run().catch(err => {
  console.error('Hata:', err.message);
  process.exit(1);
});
