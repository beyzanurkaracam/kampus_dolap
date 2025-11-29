// src/scripts/seed-universities.ts

import { DataSource } from 'typeorm';
import { University } from '../entities/university.entity';
// JSON dosyanızın yolu neredeyse orayı verin. Örn: src/modules/university/university.json
import * as universityDataJson from '../modules/university/university.json'; 

export async function seedUniversities(dataSource: DataSource) {
  const universityRepository = dataSource.getRepository(University);

  console.log('🎓 Üniversiteler seed ediliyor...');

  // JSON import bazen obje olarak gelebilir, garantiye almak için cast ediyoruz
  // Eğer JSON dosyanız direkt array ise (verdiğiniz örnekteki gibi) bu çalışır.
  const universitiesData = (universityDataJson as any).default || universityDataJson;

  let addedCount = 0;
  let skippedCount = 0;

  for (const uni of universitiesData) {
    // JSON verisini Entity formatına map edelim
    // Domain'i alırken array'in ilk elemanını alıp başına '@' koyuyoruz
    const domain = uni.domains && uni.domains.length > 0 ? uni.domains[0] : null;
    
    if (!domain) {
      console.log(`⚠️  Domain bilgisi yok, geçiliyor: ${uni.name}`);
      continue;
    }

    const emailDomain = `@${domain}`;

    // Veritabanında bu isimde veya domainde üniversite var mı kontrol et
    const existingUni = await universityRepository.findOne({
      where: [
        { name: uni.name },
        { emailDomain: emailDomain } // Unique constraint hatası almamak için
      ]
    });

    if (!existingUni) {
      const newUniversity = new University();
      newUniversity.name = uni.name;
      newUniversity.emailDomain = emailDomain;
      newUniversity.city = uni['state-province'] || null; // JSON'daki state-province -> city
      newUniversity.isActive = true;
      // Logo için şimdilik null bırakıyoruz veya default bir link verebilirsiniz
      newUniversity.logo = ""; 

      await universityRepository.save(newUniversity);
      addedCount++;
      // Konsolu çok kirletmemek için her ekleneni yazdırmıyoruz, isterseniz açabilirsiniz
      // console.log(`✅ Eklendi: ${uni.name}`);
    } else {
      skippedCount++;
    }
  }

  console.log(`📦 Üniversite Seed Sonucu:`);
  console.log(`   ✅ ${addedCount} yeni üniversite eklendi.`);
  console.log(`   ⏭️  ${skippedCount} üniversite zaten mevcuttu.`);
  console.log('✨ Üniversite seed işlemi tamamlandı!');
}