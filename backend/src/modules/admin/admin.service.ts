import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Product } from 'src/entities/product.entity';
import { Admin } from 'src/entities/admin.entity';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  async getDashboardStats() {
    const [totalUsers, totalProducts, activeProducts, totalAdmins, pendingProducts] = await Promise.all([
      this.userRepository.count(),
      this.productRepository.count(),
      this.productRepository.count({ where: { status: 'active' } }),
      this.adminRepository.count(),
      this.productRepository.count({ where: { status: 'pending' } }),
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
}
