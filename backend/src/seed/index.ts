// src/scripts/seed.ts

import { DataSource } from 'typeorm';
import { seedCategories } from './seed-categories';
import { seedUniversities } from './seed-universities'; // <--- YENİ IMPORT
import * as dotenv from 'dotenv';
import { seedProducts } from './seed-products';

// .env dosyasını yükle
dotenv.config();

// TypeORM DataSource configuration
// TypeORM DataSource configuration
const AppDataSource = new DataSource({
  type: 'postgres',
  // Senin .env dosyanla uyumlu hale getirildi
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'beyza123', // Buraya gerçek şifreni yazabilirsin
  database: process.env.DB_DATABASE || 'kampus_dolap_db',
  
  // __dirname ile mutlak yol kullanmak ts-node hatalarını önler
  entities: [__dirname + '/../entities/**/*.entity.{ts,js}'],
  
  // EĞER tabloların henüz veritabanında oluşmadıysa burayı geçici olarak true yap:
  synchronize: false, 
});

async function runSeed() {
  console.log('🚀 Seed işlemi başlatılıyor...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database bağlantısı kuruldu\n');

    // 1. Kategorileri seed et
    await seedCategories(AppDataSource);
    
    console.log('-'.repeat(30));

    // 2. Üniversiteleri seed et
    await seedUniversities(AppDataSource);

    console.log('-'.repeat(30));

    // 3. Ürünleri seed et (YENİ EKLENEN KISIM)
    // NOT: Ürünler kullanıcıya ihtiyaç duyar. Eğer veritabanında hiç user yoksa 
    // önce manuel bir user oluşturman veya buraya bir "seedUsers" eklemen gerekebilir.
    // Şimdilik sistemde en az 1 kullanıcı olduğunu varsayıyoruz.
    await seedProducts(AppDataSource); // <--- YENİ ÇAĞRI (2)

    console.log('\n🎉 Tüm seed işlemleri başarıyla tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed işlemi sırasında hata:', error);
    process.exit(1);
  }
}

runSeed();