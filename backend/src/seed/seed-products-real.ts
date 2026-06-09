/**
 * seed-products-real.ts
 * ------------------------------------------------------------------
 * 50 adet ürünü:
 *   - kategoriye UYGUN isimlerle (şablonlardan)
 *   - rastgele renk / durum / marka / fiyat / görüntülenme ile
 *   - GERÇEK görselle (yerel klasörden alıp S3'e Sharp ile optimize ederek yükler)
 * oluşturur ve Sakarya Üniversitesi'ne bağlar.
 *
 * Çalıştırma (backend/ klasöründen):
 *   1) (opsiyonel) görselleri indir:   npx ts-node src/seed/download-images.ts
 *   2) S3 modu (varsayılan):           npx ts-node src/seed/seed-products-real.ts
 *   3) S3'süz hızlı mod:               SEED_USE_S3=false npx ts-node src/seed/seed-products-real.ts
 *
 * ENV: DATABASE_* (yoksa DB_* ile fallback — tuzak baştan kapatıldı) + AWS_* (S3 modunda)
 * ------------------------------------------------------------------
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Category } from '../entities/category.entity';
import { University } from '../entities/university.entity';
import { User } from '../entities/user.entity';

dotenv.config();

// ---------------- Ayarlar ----------------
const TOTAL = 50;
const USE_S3 = (process.env.SEED_USE_S3 ?? 'true').toLowerCase() !== 'false';
const ASSETS_DIR = path.join(__dirname, '..', '..', 'seed-assets', 'images');

// ---------------- DB env (DATABASE_* yoksa DB_* — env tuzağı kapatıldı) ----------------
const DB = {
  host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || process.env.DB_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.DATABASE_NAME || process.env.DB_DATABASE || 'postgres',
};
// Supabase TLS gerektirir. Hata alırsan DB_SSL=false ile kapatabilirsin.
const sslEnv = process.env.DB_SSL;
const DB_SSL =
  sslEnv === 'false' ? false
  : sslEnv === 'true' ? { rejectUnauthorized: false }
  : DB.host.includes('localhost') ? false
  : { rejectUnauthorized: false };

// ---------------- Ürün şablonları (kategori-uygun isim + görsel anahtarı) ----------------
interface Template {
  keyword: string;     // seed-assets/images/<keyword> klasörü + remote anahtar
  catHints: string[];  // DB kategorisini ada göre eşlemek için ipuçları
  titles: string[];
  brands: string[];
  price: [number, number];
}

const TEMPLATES: Template[] = [
  { keyword: 'textbook', catHints: ['kitap', 'book', 'ders', 'akademik', 'yayın'],
    titles: ['Kalkülüs 1 Ders Kitabı', 'Veri Yapıları ve Algoritmalar', 'Olasılık ve İstatistik', 'Genel Fizik Cilt 1', 'Mikroekonomiye Giriş', 'Lineer Cebir', 'English Grammar in Use'],
    brands: ['Palme', 'Nobel', 'Pearson', 'Seçkin', 'Akademi'], price: [25, 350] },

  { keyword: 'laptop', catHints: ['laptop', 'bilgisayar', 'elektronik', 'electronic', 'computer'],
    titles: ['MacBook Air M1', 'Asus VivoBook Dizüstü', 'Lenovo ThinkPad', 'HP Pavilion Laptop', 'Dell Inspiron 15', 'Monster Abra Laptop'],
    brands: ['Apple', 'Asus', 'Lenovo', 'HP', 'Dell', 'Monster', 'MSI'], price: [4000, 32000] },

  { keyword: 'smartphone', catHints: ['telefon', 'phone', 'elektronik', 'cep'],
    titles: ['iPhone 12 128GB', 'Samsung Galaxy S21', 'Xiaomi Redmi Note 11', 'iPhone 11 64GB', 'Oppo Reno 7'],
    brands: ['Apple', 'Samsung', 'Xiaomi', 'Oppo'], price: [3500, 35000] },

  { keyword: 'calculator', catHints: ['hesap', 'calculator', 'kırtasiye', 'elektronik'],
    titles: ['Casio FX-991EX Hesap Makinesi', 'Bilimsel Hesap Makinesi', 'Casio Grafik Hesap Makinesi'],
    brands: ['Casio', 'Texas Instruments'], price: [200, 900] },

  { keyword: 'bicycle', catHints: ['bisiklet', 'bicycle', 'spor', 'sport'],
    titles: ['Dağ Bisikleti 26 Jant', 'Salcano Şehir Bisikleti', '28 Jant Yol Bisikleti', 'Katlanır Bisiklet'],
    brands: ['Salcano', 'Bianchi', 'Carraro', 'Kron'], price: [1800, 14000] },

  { keyword: 'jacket', catHints: ['mont', 'ceket', 'giyim', 'clothing', 'kıyafet', 'sweat', 'erkek', 'kadın'],
    titles: ['Kışlık Şişme Mont', 'Kapüşonlu Sweatshirt', 'Kot Ceket', 'Yağmurluk Mont', 'Polar Ceket'],
    brands: ['Nike', 'Adidas', 'Zara', 'Mavi', 'LC Waikiki', 'Columbia'], price: [150, 2800] },

  { keyword: 'sneakers', catHints: ['ayakkabı', 'shoe', 'sneaker', 'spor'],
    titles: ['Spor Ayakkabı Beyaz', 'Koşu Ayakkabısı', 'Sneaker 42 Numara', 'Günlük Spor Ayakkabı'],
    brands: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Skechers'], price: [350, 4500] },

  { keyword: 'furniture', catHints: ['masa', 'mobilya', 'furniture', 'ev', 'home', 'raf'],
    titles: ['Çalışma Masası', 'Ofis Sandalyesi', 'Kitaplık Raf', 'Komodin', 'Beyaz Çalışma Masası'],
    brands: ['IKEA', 'Bellona', 'İstikbal', 'Mondi'], price: [300, 5500] },

  { keyword: 'guitar', catHints: ['gitar', 'müzik', 'music', 'enstrüman', 'hobi'],
    titles: ['Akustik Gitar', 'Klasik Gitar', 'Elektro Gitar', 'Başlangıç Seviye Gitar'],
    brands: ['Yamaha', 'Fender', 'SX', 'Cort'], price: [800, 9000] },

  { keyword: 'refrigerator', catHints: ['buzdolabı', 'beyaz eşya', 'appliance', 'ev aleti', 'home'],
    titles: ['Mini Buzdolabı', 'Su Isıtıcısı (Kettle)', 'Mikrodalga Fırın', 'Buharlı Ütü'],
    brands: ['Arçelik', 'Bosch', 'Vestel', 'Philips', 'Beko'], price: [300, 11000] },
];

// kullanılmışa ağırlıklı durum dağılımı (enum: new/like_new/good/fair/poor)
const CONDITIONS = ['like_new', 'good', 'good', 'fair', 'new', 'poor'];
const COLORS = ['Siyah', 'Beyaz', 'Mavi', 'Kırmızı', 'Gri', 'Yeşil', 'Lacivert', 'Bej', 'Pembe', 'Mor'];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(a: T[]): T => a[rand(a.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------------- S3 ----------------
function makeS3(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
}

async function uploadToS3(s3: S3Client, fileBuffer: Buffer): Promise<string> {
  const bucket = process.env.AWS_BUCKET_NAME as string;
  const region = process.env.AWS_REGION || 'eu-central-1';
  const key = `products/${uuidv4()}.jpg`;

  // UploadService ile aynı mantık: 1200x1200 inside, jpeg q80
  const optimized = await sharp(fileBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg',
  }));

  // Üretimdeki UploadService'in döndürdüğü ile aynı biçim (doğrudan S3 URL)
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// klasördeki yerel görseller (S3 modunda)
function imagesFor(keyword: string): string[] {
  const dir = path.join(ASSETS_DIR, keyword);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => path.join(dir, f));
}

// remote URL (S3'süz mod veya klasör boşsa fallback)
function remoteUrl(keyword: string): string {
  return `https://loremflickr.com/640/640/${keyword}?lock=${randInt(1, 99999)}`;
}

// ---------------- Asıl seed ----------------
export async function seedProductsReal(ds: DataSource): Promise<void> {
  const productRepo = ds.getRepository(Product);
  const imageRepo = ds.getRepository(ProductImage);
  const categoryRepo = ds.getRepository(Category);
  const universityRepo = ds.getRepository(University);
  const userRepo = ds.getRepository(User);

  // Sakarya Üniversitesi
  const sakarya = await universityRepo.findOne({ where: { name: 'Sakarya Üniversitesi' } });
  if (!sakarya) {
    console.error('❌ "Sakarya Üniversitesi" bulunamadı. Önce üniversiteleri seed et.');
    return;
  }

  const categories = await categoryRepo.find();
  if (categories.length === 0) {
    console.error('❌ Hiç kategori yok. Önce kategorileri seed et.');
    return;
  }

  // Satıcılar — yeterli kullanıcı yoksa demo öğrenciler oluştur
  const targetEmail = 'kenan.yaylacık@ogr.sakarya.edu.tr'; // <-- Buraya kendi e-postanı yaz
  const tarikUser = await userRepo.findOne({ where: { email: targetEmail } });
  
  if (!tarikUser) {
    console.error(`❌ ${targetEmail} kullanıcısı bulunamadı! Önce uygulamadan bu email ile kayıt ol.`);
    return;
  }
  
  // Havuzu sadece 1 kişiden (senden) oluştur
  const sellerPool = [tarikUser];

  // şablonun catHints'ine en uygun DB kategorisini bul, yoksa rastgele
  const matchCategory = (hints: string[]): Category => {
    const found = categories.find((c) => hints.some((h) => c.name.toLowerCase().includes(h)));
    return found || pick(categories);
  };

  const s3 = USE_S3 ? makeS3() : null;
  console.log(`🌱 ${TOTAL} ürün ekleniyor (S3: ${USE_S3 ? 'AÇIK — görseller yüklenecek' : 'KAPALI — remote URL'})...\n`);

  let created = 0;
  for (let i = 0; i < TOTAL; i++) {
    const tpl = TEMPLATES[i % TEMPLATES.length];
    const title = pick(tpl.titles);
    const category = matchCategory(tpl.catHints);
    const seller = pick(sellerPool);

    const p = new Product();
    p.title = title;
    p.description = `${title}. Sakarya kampüsünde elden teslim edilebilir. Temiz ve bakımlı, ihtiyaç fazlası olduğu için satıyorum.`;
    p.price = randInt(tpl.price[0], tpl.price[1]);
    p.condition = pick(CONDITIONS) as Product['condition'];
    p.brand = pick(tpl.brands);
    p.color = pick(COLORS);
    p.status = 'active' as Product['status']; // admin onayını atla, doğrudan yayında
    p.seller = seller;
    p.category = category;
    p.categoryName = category.name;
    p.university = sakarya;
    p.viewCount = randInt(0, 600);

    const saved = await productRepo.save(p);

    // Görsel
    let imageUrl: string;
    try {
      if (USE_S3 && s3) {
        const files = imagesFor(tpl.keyword);
        if (files.length === 0) {
          console.warn(`  ! "${tpl.keyword}" klasörü boş — remote URL kullanılıyor.`);
          imageUrl = remoteUrl(tpl.keyword);
        } else {
          const buffer = fs.readFileSync(pick(files));
          imageUrl = await uploadToS3(s3, buffer);
        }
      } else {
        imageUrl = remoteUrl(tpl.keyword);
      }
    } catch (e) {
      console.warn(`  ! Görsel hatası (${title}): ${(e as Error).message} — remote URL'e düşülüyor.`);
      imageUrl = remoteUrl(tpl.keyword);
    }

    const img = new ProductImage();
    img.product = saved;
    img.imageUrl = imageUrl;
    img.isPrimary = true;
    img.order = 0;
    await imageRepo.save(img);

    created++;
    console.log(`  ✓ [${created}/${TOTAL}] ${title} — ${p.price}₺ — ${category.name} — ${p.color}`);
  }

  console.log(`\n✨ ${created} ürün başarıyla eklendi.`);
}

// ---------------- Standalone çalıştırıcı ----------------
if (require.main === module) {
  const ds = new DataSource({
    type: 'postgres',
    host: DB.host,
    port: DB.port,
    username: DB.username,
    password: DB.password,
    database: DB.database,
    entities: [__dirname + '/../entities/**/*.entity.{ts,js}'],
    synchronize: false,
    ssl: DB_SSL,
  });

  ds.initialize()
    .then(async () => {
      console.log(`✅ DB bağlandı (${DB.host})`);
      await seedProductsReal(ds);
      await ds.destroy();
      process.exit(0);
    })
    .catch((e) => {
      console.error('❌ Hata:', e);
      process.exit(1);
    });
}