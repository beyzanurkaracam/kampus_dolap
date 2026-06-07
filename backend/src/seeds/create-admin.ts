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

// Terminalden gelen parametreleri yakalıyoruz
const [email, password, fullName = 'Beyzanur Admin'] = process.argv.slice(2);

if (!email || !password) {
  console.error('❌ Kullanım: npm run seed:admin -- <email> <şifre> [ad soyad]');
  process.exit(1);
}

async function run() {
  const ds = new DataSource({
    type: 'postgres',
    host: 'aws-1-eu-central-1.pooler.supabase.com',
    port: parseInt('5432'),
    username: 'postgres.helntuascsdkohdkcdue',
    password: 'spHX6z33cK$A$id',
    database: 'postgres',
    entities: [User, University, Product, ProductImage, Category, CampusLocation, Follow],
    synchronize: false,
    // SUPABASE İÇİN ZORUNLU SSL AYARI:
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await ds.initialize();
  console.log('✅ Database bağlantısı kuruldu');

  const repo = ds.getRepository(User);

  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log(`⚠️ Bu email zaten kayıtlı: ${email}`);
    await ds.destroy();
    return;
  }

  // Şifreyi bcrypt ile hashliyoruz
  const hashed = await bcrypt.hash(password, 10);
  
  const admin = repo.create({
    email: email,             // Terminalden gelen email
    password: hashed,         // HASH'lenmiş şifre (DÜZ METİN DEĞİL!)
    fullName: fullName,       // Terminalden gelen veya varsayılan isim
    role: 'ADMIN',
    emailVerified: true,
    isActive: true,
    universityId: null,
  });

  await repo.save(admin);
  console.log(`🎉 Admin oluşturuldu: ${email} (${fullName})`);
  await ds.destroy();
}

run().catch(err => {
  console.error('❌ Hata:', err.message);
  process.exit(1);
});