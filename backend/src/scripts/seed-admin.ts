/**
 * Admin Seed Script
 * 
 * main.ts'ten taşındı. Production'da çalışmaz.
 * Kullanım: npx ts-node src/scripts/seed-admin.ts
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// Production'da seed çalışmasın
if (process.env.NODE_ENV === 'production') {
  console.log('⚠️  Production ortamında admin seed çalıştırılamaz.');
  process.exit(0);
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'secondhand_db',
  entities: [__dirname + '/../entities/**/*.entity.{ts,js}'],
  synchronize: false,
});

async function seedAdmin() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database bağlantısı kuruldu');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ ADMIN_EMAIL ve ADMIN_PASSWORD env değişkenleri gerekli');
      process.exit(1);
    }

    // Admin entity'sini dinamik bul
    const adminRepository = AppDataSource.getRepository('Admin');

    const existingAdmin = await adminRepository.findOne({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await adminRepository.save({
        email: adminEmail,
        password: hashedPassword,
      });
      console.log(`✅ Admin kullanıcısı oluşturuldu: ${adminEmail}`);
    } else {
      console.log('⏭️  Admin kullanıcısı zaten mevcut');
    }

    await AppDataSource.destroy();
    console.log('✅ Seed tamamlandı');
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
}

seedAdmin();