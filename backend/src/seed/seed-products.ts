import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { University } from '../entities/university.entity';
import { ProductImage } from '../entities/product-image.entity';

// Rastgele veri üretmek için yardımcı listeler
const ADJECTIVES = ['Temiz', 'Az Kullanılmış', 'Sıfır Ayarında', 'Yepyeni', 'Vintage', 'Acil Satılık', 'Öğrenciden', 'Uygun Fiyatlı'];
const NOUNS = ['Matematik Kitabı', 'Çalışma Masası', 'Laptop', 'Bisiklet', 'Gitar', 'Kışlık Mont', 'Spor Ayakkabı', 'Hesap Makinesi', 'iPhone 11', 'PS4 Oyun Konsolu', 'Buzdolabı', 'Kettle'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const COLORS = ['Siyah', 'Beyaz', 'Mavi', 'Kırmızı', 'Gri', 'Yeşil'];
const BRANDS = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Ikea', 'Zara', 'Mavi', 'Casio', 'Bosch', 'Monster'];

// Rastgele sayı üretici
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
// Diziden rastgele eleman seçici
const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export async function seedProducts(dataSource: DataSource) {
  const productRepository = dataSource.getRepository(Product);
  const userRepository = dataSource.getRepository(User);
  const categoryRepository = dataSource.getRepository(Category);
  const universityRepository = dataSource.getRepository(University);
  const imageRepository = dataSource.getRepository(ProductImage);

  console.log('Sakarya Üniversitesi için ürünler seed ediliyor...');

  // 1. İlişkili verileri çek
  const users = await userRepository.find();
  const categories = await categoryRepository.find();

  // Veritabanındaki isme göre "Sakarya Üniversitesi"ni çekiyoruz.
  // Eğer ismin tam halinden emin değilsen 'Like' operatörü de kullanılabilir ama genelde tam isim çalışır.
  const sakaryaUni = await universityRepository.findOne({
    where: { name: 'Sakarya Üniversitesi' }
  });

  if (!sakaryaUni) {
    console.error('HATA: "Sakarya Üniversitesi" veritabanında bulunamadı! Lütfen önce üniversiteleri seed ettiğinizden emin olun.');
    return;
  }

  if (users.length === 0 || categories.length === 0) {
    console.warn('Önce Kullanıcı ve Kategori eklemeniz gerekiyor. Ürün eklenemedi.');
    return;
  }

  const productsToCreate = 50; // 50 Adet Sakarya ilanı
  let createdCount = 0;

  for (let i = 0; i < productsToCreate; i++) {
    const randomUser = getRandomItem(users);
    const randomCategory = getRandomItem(categories);
    
    // Rastgele başlık ve açıklama
    const adjective = getRandomItem(ADJECTIVES);
    const noun = getRandomItem(NOUNS);
    const title = `${adjective} ${noun}`;
    
    const product = new Product();
    product.title = title;
    product.description = `${title}. Sakarya kampüs içinde elden teslim edebilirim. İhtiyaç fazlası olduğu için satıyorum.`;
    product.price = getRandomInt(50, 5000); 
    product.condition = getRandomItem(CONDITIONS);
    product.brand = getRandomItem(BRANDS);
    product.color = getRandomItem(COLORS);
    product.status = 'active'; 
    product.seller = randomUser;
    product.category = randomCategory;
    product.categoryName = randomCategory.name;
    
    // ⭐ Tüm ürünleri Sakarya Üniversitesi'ne atıyoruz
    product.university = sakaryaUni; 
    
    product.viewCount = getRandomInt(0, 500);

    const savedProduct = await productRepository.save(product);

    // 2. Rastgele Resim Ekle 
    const image = new ProductImage();
    image.product = savedProduct;
    // Farklı resimler gelmesi için random parametresini değiştiriyoruz
    image.imageUrl = `https://picsum.photos/400/400?random=${Date.now() + i}`; 
    image.isPrimary = true;
    
    await imageRepository.save(image);
    
    createdCount++;
  }

  console.log(`✨ Sakarya Üniversitesi için ${createdCount} adet dummy ürün başarıyla eklendi!`);
}