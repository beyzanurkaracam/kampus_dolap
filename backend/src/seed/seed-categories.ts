import { DataSource } from 'typeorm';
import { Category } from '../entities/category.entity';
import * as categoriesData from '../modules/add-product/categories.json';

export async function seedCategories(dataSource: DataSource) {
  const categoryRepository = dataSource.getRepository(Category);

  console.log('🌱 Kategoriler seed ediliyor...');

  const flatCategories: any[] = [];
  let orderCounter = 0;

  categoriesData.categories.forEach((mainCat: any) => {
    mainCat.sections.forEach((section: any) => {
      section.items.forEach((item: any) => {
        if (item.name !== 'Browse All') {
          flatCategories.push({
            name: `${mainCat.name} - ${item.name}`,
            description: `${mainCat.name} - ${item.name}`,
            isActive: true,
            order: orderCounter++,
          });
        }
      });
    });
  });

  console.log(`📦 ${flatCategories.length} kategori bulundu`);

  for (const catData of flatCategories) {
    // Zaten var mı kontrol et
    const existing = await categoryRepository.findOne({
      where: { name: catData.name },
    });

    if (!existing) {
      const category = categoryRepository.create(catData);
      await categoryRepository.save(category);
      console.log(`✅ Eklendi: ${catData.name}`);
    } else {
      console.log(`⏭️  Zaten var: ${catData.name} (ID: ${existing.id})`);
    }
  }

  console.log('✨ Kategori seed işlemi tamamlandı!');
}
