import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Product } from 'src/entities/product.entity';


@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product) // ✅ Add this
    private productRepository: Repository<Product>,
  ) {}

  async verifyAndActivatePremium(userId: string, dto: VerifyPaymentDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    console.log(`💰 Ödeme Doğrulama İsteği: User ${userId}, Platform: ${dto.platform}`);

    // --- GERÇEK DOĞRULAMA ALANI (PRODUCTION) ---
    // Burada Google veya Apple API'lerine gidip 'dto.receipt'in geçerli olup olmadığı sorulur.
    // Şimdilik "Simülasyon" yapıyoruz: Receipt dolu gelirse kabul et.
    
    if (!dto.receipt) {
        throw new BadRequestException('Ödeme makbuzu (receipt) geçersiz.');
    }

    // Doğrulama başarılı varsayıyoruz...
    
    // Süre hesapla (Örn: 1 ay)
    const now = new Date();
    const expiresAt = new Date(now.setDate(now.getDate() + 30));

    user.isPremium = true;
    user.premiumExpiresAt = expiresAt;

    await this.userRepository.save(user);

    const suspendedProducts = await this.productRepository.find({
      where: {
          sellerId: userId,
          status: 'inactive', // Make sure this matches the status used in cron job
      }
  });

  if (suspendedProducts.length > 0) {
      for (const product of suspendedProducts) {
          product.status = 'active';
          await this.productRepository.save(product);
      }
      console.log(`Reactivated ${suspendedProducts.length} products for user ${userId}`);
  }

    return {
      success: true,
      message: 'Premium üyelik başarıyla doğrulandı ve aktif edildi.',
      isPremium: true,
      expiresAt: expiresAt,
    };
  }
}