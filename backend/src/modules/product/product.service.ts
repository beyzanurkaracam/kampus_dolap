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
  ) {}

  // Tüm aktif ürünleri getir (admin onaylamış olanlar)
  async getAllActiveProducts(): Promise<Product[]> {
    return this.productRepository.find({
      where: { status: 'active' },
      relations: ['images', 'category', 'university', 'seller'],
      order: { createdAt: 'DESC' },
    });
  }

  // Kullanıcının ürünlerini getir
  async getMyProducts(userId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { sellerId: userId },
      relations: ['images', 'category', 'university'],
      order: { createdAt: 'DESC' },
    });
  }

  // Tek ürün detayı getir
  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['images', 'category', 'university', 'seller'],
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    return product;
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

  // Ürün durumunu güncelle
  async updateProductStatus(productId: string, userId: string, status: string): Promise<Product> {
    const product = await this.productRepository.findOne({ 
      where: { id: productId, sellerId: userId }
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı veya size ait değil');
    }

    const validStatuses = ['active', 'pending', 'sold', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Geçersiz durum');
    }

    product.status = status;
    return await this.productRepository.save(product);
  }
}
