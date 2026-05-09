import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  forwardRef, // 👈 EKLENDİ
  Inject,     // 👈 EKLENDİ
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Offer, OfferStatus } from '../../entities/offer.entity';
import { Product } from '../../entities/product.entity';
import { Chat } from '../../entities/chat.entity';
import { ChatService } from '../chat/chat.service';
import { BlockService } from '../block/block.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../entities/notification.entity';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    
    // 👇 AŞAĞIDAKİ İKİ SATIR DÜZELTİLDİ (@Inject ve forwardRef eklendi)
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    
    @Inject(forwardRef(() => BlockService))
    private blockService: BlockService,
    
    private notificationService: NotificationService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // 1) İLK TEKLİF / SATIN AL (Alıcı yapar)
  // ─────────────────────────────────────────────────────────────
  async createOffer(userId: string, dto: CreateOfferDto): Promise<Offer> {
    const product = await this.productRepository.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Ürün bulunamadı');
    if (product.sellerId === userId) throw new BadRequestException('Kendi ürününüze teklif veremezsiniz');
    if (product.status !== 'active') {
      throw new BadRequestException('Bu ürün şu an teklif almıyor');
    }

    if (await this.blockService.isEitherBlocked(userId, product.sellerId)) {
      throw new ForbiddenException('Bu satıcıyla işlem yapamazsınız');
    }

    const activeOffer = await this.offerRepository.findOne({
      where: {
        productId: dto.productId,
        buyerId: userId,
        status: In([OfferStatus.PENDING, OfferStatus.ACCEPTED]),
      },
    });
    if (activeOffer) {
      throw new BadRequestException('Zaten açık bir teklif süreciniz var.');
    }

    const offer = await this.offerRepository.save(
      this.offerRepository.create({
        buyerId: userId,
        sellerId: product.sellerId,
        productId: dto.productId,
        offerAmount: dto.amount,
        makerId: userId,
        status: OfferStatus.PENDING,
      }),
    );

    await this.notificationService.createNotification({
      recipientId: product.sellerId,
      senderId: userId,
      type: NotificationType.OFFER,
      title: 'Yeni Teklif',
      message: `${dto.amount} TL teklif aldınız.`,
      referenceId: offer.id,
      referenceType: 'offer',
    });

    return offer;
  }

  // ─────────────────────────────────────────────────────────────
  // 2) KARŞI TEKLİF (Sadece fiyat — meeting yok)
  // ─────────────────────────────────────────────────────────────
  async counterOffer(userId: string, originalOfferId: string, newAmount: number): Promise<Offer> {
    const original = await this.offerRepository.findOne({ where: { id: originalOfferId } });
    if (!original) throw new NotFoundException('Orijinal teklif bulunamadı');

    if (userId !== original.sellerId && userId !== original.buyerId) {
      throw new ForbiddenException('Bu teklife müdahale yetkiniz yok');
    }
    if (original.makerId === userId) {
      throw new BadRequestException('Kendi teklifinize karşı teklif yapamazsınız.');
    }
    if (original.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Bu teklif artık aktif değil.');
    }

    if (await this.blockService.isEitherBlocked(original.buyerId, original.sellerId)) {
      throw new ForbiddenException('Bu kullanıcıyla işlem yapamazsınız');
    }

    original.status = OfferStatus.COUNTERED;
    await this.offerRepository.save(original);

    const counter = await this.offerRepository.save(
      this.offerRepository.create({
        buyerId: original.buyerId,
        sellerId: original.sellerId,
        productId: original.productId,
        offerAmount: newAmount,
        makerId: userId,
        status: OfferStatus.PENDING,
      }),
    );

    const targetUserId = userId === original.sellerId ? original.buyerId : original.sellerId;
    await this.notificationService.createNotification({
      recipientId: targetUserId,
      senderId: userId,
      type: NotificationType.OFFER,
      title: 'Karşı Teklif',
      message: `Yeni teklif: ${newAmount} TL`,
      referenceId: counter.id,
      referenceType: 'offer',
    });

    return counter;
  }

  // ─────────────────────────────────────────────────────────────
  // 3) KABUL — Chat otomatik açılır, ilk mesaj satıcıya kilitli
  // ─────────────────────────────────────────────────────────────
  async acceptOffer(userId: string, offerId: string): Promise<{ offer: Offer; chatId: string }> {
    const offer = await this.offerRepository.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadı');

    if (offer.makerId === userId) {
      throw new BadRequestException('Kendi teklifinizi kabul edemezsiniz.');
    }
    if (userId !== offer.sellerId && userId !== offer.buyerId) {
      throw new ForbiddenException('Bu teklife yetkiniz yok');
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Bu teklif artık aktif değil.');
    }

    if (await this.blockService.isEitherBlocked(offer.buyerId, offer.sellerId)) {
      throw new ForbiddenException('Bu kullanıcıyla işlem yapamazsınız');
    }

    offer.status = OfferStatus.ACCEPTED;
    await this.offerRepository.save(offer);

    const chat = await this.chatService.openChatForAcceptedOffer(offer);

    await this.notificationService.createNotification({
      recipientId: offer.makerId,
      senderId: userId,
      type: NotificationType.OFFER_ACCEPTED,
      title: 'Teklif Kabul Edildi',
      message: 'Teklifiniz kabul edildi. Satıcının ilk mesajını bekleyin.',
      referenceId: offer.id,
      referenceType: 'offer',
    });

    return { offer, chatId: chat.id };
  }

  // ─────────────────────────────────────────────────────────────
  // 4) RED / İPTAL
  // ─────────────────────────────────────────────────────────────
  async rejectOffer(userId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepository.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadı');

    if (userId !== offer.sellerId && userId !== offer.buyerId) {
      throw new ForbiddenException('Bu teklife yetkiniz yok');
    }
    if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.ACCEPTED) {
      throw new BadRequestException('Bu teklif artık değiştirilemez.');
    }

    offer.status = userId === offer.makerId ? OfferStatus.CANCELLED : OfferStatus.REJECTED;
    await this.offerRepository.save(offer);

    const targetUserId = userId === offer.sellerId ? offer.buyerId : offer.sellerId;
    await this.notificationService.createNotification({
      recipientId: targetUserId,
      senderId: userId,
      type: NotificationType.OFFER_REJECTED,
      title: 'Teklif İptal',
      message: 'Teklif süreci sonlandı.',
      referenceId: offer.id,
      referenceType: 'offer',
    });

    return offer;
  }

  // ─────────────────────────────────────────────────────────────
  // 5) GELEN KUTUSU / GİDEN KUTUSU
  // ─────────────────────────────────────────────────────────────
  async getOffersReceived(userId: string): Promise<Offer[]> {
    // Bana gelen = sürecin tarafıyım VE kararı ben vereceğim (makerId != ben), status pending
    return this.offerRepository.find({
      where: [
        { sellerId: userId, makerId: Not(userId), status: OfferStatus.PENDING },
        { buyerId: userId, makerId: Not(userId), status: OfferStatus.PENDING },
      ],
      relations: ['product', 'buyer', 'product.images', 'product.seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOffersMade(userId: string): Promise<Offer[]> {
    return this.offerRepository.find({
      where: {
        makerId: userId,
        status: OfferStatus.PENDING,
      },
      relations: ['product', 'buyer', 'product.images', 'product.seller'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6) Block / Sat / Sold akışlarında DIŞARIDAN çağrılan iptal
  // ─────────────────────────────────────────────────────────────
  async cancelActiveBetween(userAId: string, userBId: string): Promise<number> {
    const active = await this.offerRepository.find({
      where: [
        { buyerId: userAId, sellerId: userBId, status: In([OfferStatus.PENDING, OfferStatus.ACCEPTED]) },
        { buyerId: userBId, sellerId: userAId, status: In([OfferStatus.PENDING, OfferStatus.ACCEPTED]) },
      ],
    });
    if (active.length === 0) return 0;

    for (const o of active) o.status = OfferStatus.CANCELLED;
    await this.offerRepository.save(active);
    return active.length;
  }
}
