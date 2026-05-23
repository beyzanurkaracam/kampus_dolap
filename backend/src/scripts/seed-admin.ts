// backend/src/scripts/seed-admin.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Admin } from '../entities/admin.entity';

// .env dosyasındaki değişkenleri okumak için
dotenv.config();

async function seedAdmin() {
  // Sadece development'ta çalışsın
  if (process.env.NODE_ENV === 'production') {
    console.log('Production ortamında seed çalışmaz.');
    return;
  }

  // Kendi veritabanı bağlantımızı kuruyoruz
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD, // .env'den alacak
    database: process.env.DATABASE_NAME || 'secondhand_db',
    entities: [Admin], // Sadece Admin tablosu lazım
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('🔌 Veritabanına bağlanıldı.');

  const adminRepository = dataSource.getRepository(Admin);
  
  const adminEmail = process.env.ADMIN_EMAIL || 'beyzanur.karacam@sakarya.edu.tr';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const existingAdmin = await adminRepository.findOne({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await adminRepository.save({
      email: adminEmail,
      password: hashedPassword,
    });
    console.log('✅ Admin kullanıcısı oluşturuldu:', adminEmail);
  } else {
    console.log('⏭️ Admin kullanıcısı zaten mevcut.');
  }

  await dataSource.destroy();
  console.log('✨ Admin seed tamamlandı.');
}

seedAdmin();