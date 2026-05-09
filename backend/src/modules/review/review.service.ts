import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { Offer, OfferStatus } from '../../entities/offer.entity';
import { Product } from '../../entities/product.entity';
import { User } from '../../entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createReview(buyerId: string, dto: CreateReviewDto): Promise<Review> {
    const offer = await this.offerRepo.findOne({ where: { id: dto.offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadı');
    if (offer.buyerId !== buyerId) throw new ForbiddenException('Bu teklif size ait değil');
    if (offer.status !== OfferStatus.ACCEPTED) {
      throw new BadRequestException('Sadece kabul edilen teklifler değerlendirilebilir');
    }

    const product = await this.productRepo.findOne({ where: { id: offer.productId } });
    if (!product) throw new NotFoundException('Ürün bulunamadı');
    if (product.status !== 'sold') {
      throw new BadRequestException('Ürün henüz satıldı durumunda değil');
    }

    const exists = await this.reviewRepo.findOne({ where: { offerId: dto.offerId } });
    if (exists) throw new BadRequestException('Bu satış için zaten değerlendirme yapıldı');

    const review = await this.reviewRepo.save(
      this.reviewRepo.create({
        offerId: offer.id,
        productId: offer.productId,
        sellerId: offer.sellerId,
        buyerId: offer.buyerId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );

    await this.recalculateSellerRating(offer.sellerId);
    return review;
  }

  async getSellerReviews(sellerId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { sellerId },
      relations: ['buyer', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getReviewByOffer(offerId: string, viewerId: string): Promise<Review | null> {
    const review = await this.reviewRepo.findOne({
      where: { offerId },
      relations: ['buyer', 'seller', 'product'],
    });
    if (!review) return null;
    if (review.buyerId !== viewerId && review.sellerId !== viewerId) {
      throw new ForbiddenException('Bu değerlendirmeyi görüntüleme yetkiniz yok');
    }
    return review;
  }

  private async recalculateSellerRating(sellerId: string): Promise<void> {
    const { avg } = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.sellerId = :sellerId', { sellerId })
      .getRawOne<{ avg: string | null }>() ?? { avg: null };

    const numeric = avg ? parseFloat(avg) : 0;
    await this.userRepo.update(sellerId, { rating: Number(numeric.toFixed(2)) });
  }
}
