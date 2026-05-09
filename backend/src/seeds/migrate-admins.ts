import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { University } from '../entities/university.entity';
import { Product } from '../entities/product.entity';
import { Follow } from '../entities/follow.entity';

async function run() {
  require('dotenv').config({ path: `${__dirname}/../../.env` });

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432'),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'beyza123',
    database: process.env.DATABASE_NAME || 'secondhand_db',
    entities: [User, University, Product, Follow],
    synchronize: false,
  });

  await ds.initialize();

  // Admin tablosu artık entity olarak tanımlı değil, raw SQL ile okuyoruz
  const admins: { id: number; email: string; password: string }[] =
    await ds.query('SELECT id, email, password FROM admin');

  if (admins.length === 0) {
    console.log('Admin tablosunda taşınacak kayıt bulunamadı.');
    await ds.destroy();
    return;
  }

  const userRepo = ds.getRepository(User);
  let migrated = 0;

  for (const admin of admins) {
    const existing = await userRepo.findOne({ where: { email: admin.email } });
    if (existing) {
      console.log(`Atlanıyor (zaten var): ${admin.email}`);
      continue;
    }

    const user = userRepo.create({
      email: admin.email,
      password: admin.password, // zaten hashed, tekrar hashlemiyoruz
      fullName: 'Platform Admin',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
      universityId: null,
    });

    await userRepo.save(user);
    console.log(`Taşındı: ${admin.email}`);
    migrated++;
  }

  console.log(`Tamamlandı. ${migrated}/${admins.length} admin taşındı.`);
  await ds.destroy();
}

run().catch(err => {
  console.error('Hata:', err.message);
  process.exit(1);
});
