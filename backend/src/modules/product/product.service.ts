import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from 'src/entities/product.entity';
import { ProductImage } from 'src/entities/product-image.entity';
import { Category } from 'src/entities/category.entity';
import { Favorite } from 'src/entities/favorite.entity';
import * as brandsData from '../add-product/brands.json';
import * as colorsData from '../add-product/colors.json';
import { User } from 'src/entities/user.entity';
import { Offer, OfferStatus } from 'src/entities/offer.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/entities/notification.entity';

export interface CreateProductDto {
  title: string;
  description: string;
  price: number;
  categoryId: number; // Number olarak değiştirdik
  categoryName?: string; // Opsiyonel: "Women - Sweaters" gibi
  mainCategory?: string; // "Women" veya "Men"
  subCategory?: string;  // "Sweaters", "Tops", vs.
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  brand?: string;
  color?: string;
  images?: string[];
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
    @InjectRepository(User) //User repository inject edildi
    private userRepository: Repository<User>,
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    private notificationService: NotificationService,
  ) {}

// getAllActiveProducts fonksiyonunu güncelle
async getAllActiveProducts(query: any = {}): Promise<Product[]> {
  // 👇 sellerId parametresini buraya ekledik
  const { search, categoryId, minPrice, maxPrice, sort, sellerId } = query; 

  const queryBuilder = this.productRepository.createQueryBuilder('product')
    .leftJoinAndSelect('product.images', 'images')
    .leftJoinAndSelect('product.category', 'category')
    .leftJoinAndSelect('product.university', 'university')
    .leftJoinAndSelect('product.seller', 'seller')
    .where('product.status = :status', { status: 'active' });

  // 👇 BU KISMI EKLE: Satıcı ID'sine göre filtreleme
  if (sellerId) {
    queryBuilder.andWhere('product.sellerId = :sellerId', { sellerId });
  }

  // 1. Arama (Başlık veya Açıklama)
  if (search) {
    queryBuilder.andWhere(
      '(LOWER(product.title) LIKE LOWER(:search) OR LOWER(product.description) LIKE LOWER(:search))',
      { search: `%${search}%` }
    );
  }

  // 2. Kategori Filtresi
  if (categoryId) {
    // String gelirse diye Number() ile çeviriyoruz
    queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: Number(categoryId) });
  }

  // 3. Fiyat Aralığı
  if (minPrice) {
    queryBuilder.andWhere('product.price >= :minPrice', { minPrice: Number(minPrice) });
  }
  if (maxPrice) {
    queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: Number(maxPrice) });
  }

  // 4. Sıralama (Sorting)
  // Önce Premium kullanıcılar
  queryBuilder.addOrderBy('seller.isPremium', 'DESC');

  if (sort === 'price_asc') {
    queryBuilder.addOrderBy('product.price', 'ASC');
  } else if (sort === 'price_desc') {
    queryBuilder.addOrderBy('product.price', 'DESC');
  } else {
    // Varsayılan: En yeni
    queryBuilder.addOrderBy('product.createdAt', 'DESC');
  }

  return await queryBuilder.getMany();
}

// ... (rest of the service methods remain the same)


  // Kullanıcının ürünlerini getir
  async getMyProducts(userId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { sellerId: userId },
      relations: ['images', 'category', 'university'],
      order: { createdAt: 'DESC' },
    });
  }

  // Tek ürün detayı getir
  async getProductById(id: string, viewerId?: string): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['images', 'category', 'university', 'seller'],
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    const productData: any = { ...product };

    if (viewerId) {
      const acceptedOffer = await this.offerRepository.findOne({
        where: {
          productId: id,
          buyerId: viewerId,
          status: OfferStatus.ACCEPTED,
        },
      });

      if (acceptedOffer) {
        productData.acceptedOfferPrice = acceptedOffer.offerAmount;
        productData.acceptedOfferId = acceptedOffer.id;
      }
    }

    return productData;
  }

  // Category'yi bul veya oluştur
  private async findOrCreateCategory(dto: CreateProductDto): Promise<Category> {
    // Önce name ile ara (çünkü frontend JSON'dan geçici ID gönderiyor)
    const categoryName = dto.categoryName || dto.subCategory || `Category ${dto.categoryId}`;
    
    let category = await this.categoryRepository.findOne({ 
      where: { name: categoryName } 
    });

    // Yoksa oluştur
    if (!category) {
      category = new Category();
      // ID'yi database otomatik üretsin
      category.name = categoryName;
      category.description = dto.categoryName || dto.subCategory || '';
      category.isActive = true;
      category.order = 0;
      
      category = await this.categoryRepository.save(category);
      console.log('Yeni kategori oluşturuldu:', {
        id: category.id,
        name: category.name,
        description: category.description
      });
    }

    return category;
  }

  // Yeni ürün ekle
  async createProduct(
    createProductDto: CreateProductDto,
    sellerId: string,
    universityId: string,
  ): Promise<Product> {

    const user = await this.userRepository.findOne({ where: { id: sellerId } });
    
    if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Eğer kullanıcı Premium DEĞİLSE
    if (!user.isPremium) {
        // Aktif ve onay bekleyen ürünlerini say
        const productCount = await this.productRepository.count({
            where: [
                { sellerId: sellerId, status: 'active' },
                { sellerId: sellerId, status: 'pending' }
            ]
        });

        // Limit 3
        if (productCount >= 3) {
            throw new ForbiddenException('Ücretsiz üyelik ile en fazla 3 ürün yükleyebilirsiniz. Sınırsız yükleme için Premium\'a geçin!');
        }
    }

    // Category'yi bul veya oluştur (tüm DTO'yu gönder)
    const category = await this.findOrCreateCategory(createProductDto);

    const newProduct = new Product();
    newProduct.title = createProductDto.title;
    newProduct.description = createProductDto.description;
    newProduct.price = createProductDto.price;
    newProduct.categoryId = category.id; // UUID kullan
    newProduct.categoryName = createProductDto.categoryName || createProductDto.subCategory;
    newProduct.brand = createProductDto.brand;
    newProduct.color = createProductDto.color;
    newProduct.condition = createProductDto.condition;
    newProduct.sellerId = sellerId;
    newProduct.universityId = universityId;
    newProduct.status = 'pending'; // Admin onayı gerekli

    const savedProduct = await this.productRepository.save(newProduct);

    // Resimleri ekle
    if (createProductDto.images && createProductDto.images.length > 0) {
      for (const imageUrl of createProductDto.images) {
        const productImage = new ProductImage();
        productImage.productId = savedProduct.id;
        productImage.imageUrl = imageUrl;
        productImage.isPrimary = createProductDto.images.indexOf(imageUrl) === 0;
        await this.productImageRepository.save(productImage);
      }
    }

    const product = await this.productRepository.findOne({
      where: { id: savedProduct.id },
      relations: ['images', 'category'],
    });

    if (!product) {
      throw new NotFoundException('Ürün oluşturulduktan sonra bulunamadı');
    }

    return product;
  }

  // Ürünü sil
  async deleteProduct(productId: string, userId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId, sellerId: userId },
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı veya size ait değil');
    }

    await this.productRepository.remove(product);
  }

  // Kategorileri getir
  async getCategories() {
    // Database'den aktif kategorileri getir
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { order: 'ASC' },
    });

    // Frontend formatına dönüştür
    return {
      categories: categories.map(cat => {
        // "Women - Tops" gibi name'i parse et
        const parts = cat.name.split(' - ');
        const mainCategory = parts[0] || '';
        const subCategory = parts[1] || '';
        
        return {
          id: cat.id,
          name: cat.name,
          mainCategory,
          subCategory,
          brandCategory: this.mapToBrandCategory('', subCategory),
        };
      })
    };
  }

  // Kategoriyi marka kategorisine eşle
  private mapToBrandCategory(sectionId: string, itemName: string): string {
    // Clothing -> Giyim
    if (sectionId === 'clothing') return 'giyim';
    // Accessories -> çeşitli kategoriler
    if (sectionId === 'accessories') {
      if (itemName.includes('Watch')) return 'elektronik';
      return 'giyim'; // Bags, Sunglasses, etc.
    }
    return 'giyim'; // Default
  }

  // Markaları getir
  getBrands() {
    return { brands: brandsData.brands_all || [] };
  }

  // Renkleri getir
  getColors() {
    return { colors: colorsData };
  }

  // Kategoriye göre markaları getir
  getBrandsByCategory(categoryId: string) {
    // CategoryId'den brandCategory'yi çıkar
    // Eğer kategori direkt brands.json'daki bir kategori ise kullan
    const directCategory = brandsData.categories.find(cat => cat.id === categoryId);
    if (directCategory) {
      return { brands: directCategory.brands };
    }
    
    // Kategori ID'si compound ise (women-clothing-tops gibi)
    // Frontend'den gelen brandCategory kullanılacak
    // Bu durumda genel markaları döndür
    return { brands: brandsData.brands_all || [] };
  }

  // Favorilere ekle
  async addToFavorites(userId: string, productId: string): Promise<{ message: string }> {
    // Zaten favorilerde mi kontrol et
    const existing = await this.favoriteRepository.findOne({
      where: { 
        user: { id: userId },
        product: { id: productId }
      }
    });

    if (existing) {
      return { message: 'Bu ürün zaten favorilerinizde' };
    }

    // Ürünün varlığını kontrol et
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    // Favoriye ekle
    const favorite = this.favoriteRepository.create({
      user: { id: userId } as any,
      product: { id: productId } as any,
    });

    await this.favoriteRepository.save(favorite);
    return { message: 'Ürün favorilere eklendi' };
  }

  // Favorilerden çıkar
  async removeFromFavorites(userId: string, productId: string): Promise<{ message: string }> {
    const favorite = await this.favoriteRepository.findOne({
      where: { 
        user: { id: userId },
        product: { id: productId }
      }
    });

    if (!favorite) {
      throw new NotFoundException('Bu ürün favorilerinizde değil');
    }

    await this.favoriteRepository.remove(favorite);
    return { message: 'Ürün favorilerden çıkarıldı' };
  }

  // Kullanıcının favorilerini getir
  async getFavorites(userId: string): Promise<Product[]> {
    const favorites = await this.favoriteRepository.find({
      where: { user: { id: userId } },
      relations: ['product', 'product.images', 'product.category', 'product.university'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map(fav => fav.product);
  }

  // Ürün durumunu güncelle (genel kullanım — admin/edge case)
  async updateProductStatus(productId: string, userId: string, status: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId, sellerId: userId },
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı veya size ait değil');
    }

    const validStatuses = ['active', 'pending', 'sold', 'rejected', 'removed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Geçersiz durum');
    }

    product.status = status;
    return await this.productRepository.save(product);
  }

  // ─────────────────────────────────────────────────────────────
  // FAZ 2: Anlaşma Sağlandı → Rezerve et (sadece satıcı)
  // ─────────────────────────────────────────────────────────────
  async markAsReserved(productId: string, sellerId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId, sellerId },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı veya size ait değil');
    if (product.status === 'sold') throw new BadRequestException('Satılmış ürün rezerve edilemez');
    if (product.status === 'reserved') return product;

    product.status = 'reserved';
    product.reservedAt = new Date();
    product.reservedReminderSent = false;
    return this.productRepository.save(product);
  }

  // FAZ 2: Satışa geri dön (sadece satıcı)
  async unreserveProduct(productId: string, sellerId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId, sellerId },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı veya size ait değil');
    if (product.status !== 'reserved') {
      throw new BadRequestException('Sadece rezerve durumundaki ürün geri açılabilir');
    }
    product.status = 'active';
    product.reservedAt = null;
    product.reservedReminderSent = false;
    return this.productRepository.save(product);
  }

  // ─────────────────────────────────────────────────────────────
  // FAZ 3: Manuel "Satıldı" — alıcı = ACCEPTED teklifin sahibi.
  // Geriye değerlendirme tetiklemek için alıcı + offer bilgisini döner.
  // ─────────────────────────────────────────────────────────────
  async markAsSold(
    productId: string,
    sellerId: string,
  ): Promise<{ product: Product; buyerId: string | null; offerId: string | null }> {
    const product = await this.productRepository.findOne({
      where: { id: productId, sellerId },
    });
    if (!product) throw new NotFoundException('Ürün bulunamadı veya size ait değil');
    if (product.status === 'sold') {
      return { product, buyerId: null, offerId: null };
    }

    const acceptedOffer = await this.offerRepository.findOne({
      where: { productId, sellerId, status: OfferStatus.ACCEPTED },
      order: { updatedAt: 'DESC' },
    });

    product.status = 'sold';
    product.soldAt = new Date();
    const saved = await this.productRepository.save(product);

    if (acceptedOffer) {
      await this.notificationService.createNotification({
        recipientId: acceptedOffer.buyerId,
        senderId: sellerId,
        type: NotificationType.SYSTEM,
        title: 'Satış Tamamlandı',
        message: `${product.title} ürününü değerlendirin (1-5 yıldız).`,
        referenceId: acceptedOffer.id,
        referenceType: 'review_request',
      });
    }

    return {
      product: saved,
      buyerId: acceptedOffer?.buyerId ?? null,
      offerId: acceptedOffer?.id ?? null,
    };
  }


  async getSimilarProducts(productId: string): Promise<Product[]> {
    // 1. Referans ürünü çek
    const currentProduct = await this.productRepository.findOne({
      where: { id: productId },
    });
  
    if (!currentProduct) {
      throw new NotFoundException('Ürün bulunamadı');
    }
  
    // Fiyat aralığı ( %30 altı ve %30 fazlası )
    const minPrice = Number(currentProduct.price) * 0.3;
    const maxPrice = Number(currentProduct.price) * 3.3;
  
    // 2. QueryBuilder ile benzer ürünleri çek
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.seller', 'seller')
      .leftJoinAndSelect('product.category', 'category')
      
      // Mevcut ürünü hariç tut
      .where('product.id != :id', { id: productId })
      // Sadece aktif ilanlar
      .andWhere('product.status = :status', { status: 'active' })
      .andWhere('product.universityId = :uniId', { uniId: currentProduct.universityId })
      
      // Puanlama için SELECT ekle
      .addSelect(
        `(
          (CASE WHEN product."categoryId" = :catId THEN 50 ELSE 0 END) + 
          (CASE WHEN product.brand = :brand AND product.brand != '' THEN 30 ELSE 0 END) + 
          (CASE WHEN product.price BETWEEN :minPrice AND :maxPrice THEN 20 ELSE 0 END)
        )`,
        'similarity_score'
      )
      
      // Parametreleri ata
      .setParameters({
        id: productId,
        status: 'active',
        uniId: currentProduct.universityId,
        catId: currentProduct.categoryId,
        brand: currentProduct.brand || '', 
        minPrice,
        maxPrice,
      })
      
      .orderBy('similarity_score', 'DESC') // En yüksek puanlılar üstte
      .addOrderBy('RANDOM()')              // Puanı eşit olanları karıştır
      .limit(6);                            // Maksimum 6 ürün
  
    return await query.getMany();
  }
}
