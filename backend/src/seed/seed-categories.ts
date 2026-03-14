import { DataSource } from 'typeorm';
// Entity klasörün src/entities altında olduğu için bir üst dizine çıkıyoruz
import { Category } from '../entities/category.entity'; 
// JSON dosyanın yolunu projenin mevcut yapısına göre kontrol et
import * as categoriesDataJson from '../modules/add-product/categories.json';

export async function seedCategories(dataSource: DataSource) {
  const categoryRepository = dataSource.getRepository(Category);
  console.log('🌱 Kategoriler seed ediliyor...');

  // JSON importu sırasında oluşabilecek "default" sarmalamasını kontrol ediyoruz
  const rawData = (categoriesDataJson as any).default || categoriesDataJson;
  const categoriesArray = rawData.categories || rawData;

  if (!Array.isArray(categoriesArray)) {
    console.error('❌ Hata: Kategoriler bir dizi (array) değil! Lütfen JSON yapısını kontrol edin.');
    return;
  }

  let addedCount = 0;
  let skippedCount = 0;

  for (const mainCat of categoriesArray) {
    if (!mainCat.sections) continue;
    
    for (const section of mainCat.sections) {
      for (const item of section.items) {
        if (item.name === 'Browse All') continue;

        // Kampüs içi döngüsel ekonomiyi destekleyen kategorilendirme [cite: 24]
        const fullName = `${mainCat.name} - ${item.name}`;
        
        const existing = await categoryRepository.findOne({ where: { name: fullName } });

        if (!existing) {
          const category = categoryRepository.create({
            name: fullName,
            description: `${mainCat.name} kategorisi altındaki ${item.name}`,
            isActive: true
          });
          await categoryRepository.save(category);
          addedCount++;
          console.log(`✅ Eklendi: ${fullName}`);
        } else {
          skippedCount++;
        }
      }
    }
  }

  console.log(`\n📦 Kategori Seed Sonucu:`);
  console.log(`   ✅ ${addedCount} yeni kategori eklendi.`);
  console.log(`   ⏭️  ${skippedCount} kategori zaten mevcuttu.`);
  console.log('✨ Kategori seed işlemi tamamlandı!');
}