import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Product } from 'src/entities/product.entity';
import { Offer } from '../../entities/offer.entity';
import { Chat } from '../../entities/chat.entity';
import { Category } from '../../entities/category.entity';
import { University } from '../../entities/university.entity';
import { CampusLocation } from '../../entities/campus-location.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(University)
    private universityRepository: Repository<University>,
    @InjectRepository(CampusLocation)
    private campusLocationRepository: Repository<CampusLocation>,
  ) {}

  // Kullanıcı nesnesinden hassas alanları temizler (panel yanıtlarında şifre vb. sızmasın)
  private stripUser<T extends Partial<User>>(user: T) {
    if (!user) return user;
    const { password, verificationCode, verificationCodeExpiry, fcmToken, ...safe } = user as User;
    return safe;
  }

  async getDashboardStats() {
    const [totalUsers, totalProducts, activeProducts, totalAdmins, pendingProducts, totalOffers, totalChats] =
      await Promise.all([
        this.userRepository.count(),
        this.productRepository.count(),
        this.productRepository.count({ where: { status: 'active' } }),
        this.userRepository.count({ where: { role: 'ADMIN' } }),
        this.productRepository.count({ where: { status: 'pending' } }),
        this.offerRepository.count(),
        this.chatRepository.count(),
      ]);

    // Son 7 günün ürünleri
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentProducts = await this.productRepository.count({
      where: {
        createdAt: sevenDaysAgo as any,
      },
    });

    // Son kayıt olan kullanıcılar
    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      select: ['id', 'fullName', 'email', 'createdAt'],
    });

    // En yeni ürünler
    const recentProductsList = await this.productRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['seller', 'category'],
    });

    return {
      stats: {
        totalUsers,
        totalProducts,
        activeProducts,
        totalAdmins,
        pendingProducts,
        recentProducts,
        totalOffers,
        totalChats,
      },
      recentUsers,
      recentProducts: recentProductsList,
    };
  }

  // Onay bekleyen ürünleri getir
  async getPendingProducts() {
    return this.productRepository.find({
      where: { status: 'pending' },
      relations: ['seller', 'category', 'images', 'university'],
      order: { createdAt: 'ASC' },
    });
  }

  // Ürünü onayla
  async approveProduct(productId: string) {
    const product = await this.productRepository.findOne({ 
      where: { id: productId } 
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    product.status = 'active';
    await this.productRepository.save(product);

    return { message: 'Ürün onaylandı', product };
  }

  // Ürünü reddet
  async rejectProduct(productId: string, reason?: string) {
    const product = await this.productRepository.findOne({ 
      where: { id: productId } 
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    product.status = 'removed';
    await this.productRepository.save(product);

    // TODO: Kullanıcıya bildirim gönder (reason ile)
    return { message: 'Ürün reddedildi', reason };
  }

  // ─────────────────────────── KULLANICILAR ───────────────────────────

  // Tüm kullanıcıları listele (hassas alanlar temizlenmiş)
  async getAllUsers() {
    const users = await this.userRepository.find({
      relations: ['university'],
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.stripUser(u));
  }

  // Tek kullanıcı detayı
  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['university'],
    });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    return this.stripUser(user);
  }

  // Kullanıcı ban/aktif durumunu güncelle
  async updateUserStatus(id: string, isActive: boolean) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    user.isActive = isActive;
    await this.userRepository.save(user);
    return {
      message: isActive ? 'Kullanıcı aktifleştirildi' : 'Kullanıcı banlandı',
      isActive,
    };
  }

  // Kullanıcı premium durumunu güncelle
  async updateUserPremium(id: string, isPremium: boolean) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    user.isPremium = isPremium;
    await this.userRepository.save(user);
    return {
      message: isPremium ? 'Premium üyelik verildi' : 'Premium üyelik kaldırıldı',
      isPremium,
    };
  }

  // ─────────────────────────── TEKLİFLER ───────────────────────────

  // Tüm teklifleri listele (alıcı + ürün + satıcı ile)
  async getAllOffers() {
    const offers = await this.offerRepository.find({
      relations: ['buyer', 'product', 'product.seller'],
      order: { createdAt: 'DESC' },
    });
    return offers.map((o) => ({
      ...o,
      buyer: this.stripUser(o.buyer),
      product: o.product
        ? { ...o.product, seller: this.stripUser(o.product.seller) }
        : null,
    }));
  }

  // ─────────────────────────── SOHBETLER ───────────────────────────

  // Tüm sohbetleri listele (alıcı + satıcı + ürün ile)
  async getAllChats() {
    const chats = await this.chatRepository.find({
      relations: ['buyer', 'seller', 'product'],
      order: { updatedAt: 'DESC' },
    });
    return chats.map((c) => ({
      ...c,
      buyer: this.stripUser(c.buyer),
      seller: this.stripUser(c.seller),
    }));
  }

  // ─────────────────────────── KATEGORİLER ───────────────────────────

  async createCategory(data: {
    name: string;
    description?: string;
    parentId?: number;
    order?: number;
    isActive?: boolean;
  }) {
    const category = this.categoryRepository.create({
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    });
    return this.categoryRepository.save(category);
  }

  async updateCategory(
    id: number,
    data: Partial<{ name: string; description: string; isActive: boolean; parentId: number; order: number }>,
  ) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Kategori bulunamadı');
    }
    Object.assign(category, data);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Kategori bulunamadı');
    }
    await this.categoryRepository.remove(category);
    return { message: 'Kategori silindi' };
  }

  // ─────────────────────────── ÜNİVERSİTELER ───────────────────────────

  async updateUniversity(
    id: string,
    data: Partial<{ name: string; city: string; emailDomain: string; isActive: boolean }>,
  ) {
    const university = await this.universityRepository.findOne({ where: { id } });
    if (!university) {
      throw new NotFoundException('Üniversite bulunamadı');
    }
    Object.assign(university, data);
    return this.universityRepository.save(university);
  }

  // ─────────────────────────── KAMPÜS KONUMLARI ───────────────────────────

  async createCampusLocation(data: {
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    universityId: string;
    description?: string;
  }) {
    const location = this.campusLocationRepository.create(data);
    return this.campusLocationRepository.save(location);
  }

  async deleteCampusLocation(id: string) {
    const location = await this.campusLocationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('Kampüs konumu bulunamadı');
    }
    await this.campusLocationRepository.remove(location);
    return { message: 'Kampüs konumu silindi' };
  }
}
