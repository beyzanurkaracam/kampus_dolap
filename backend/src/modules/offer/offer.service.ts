import { 
  BadRequestException, 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm'; 
import { Offer, OfferStatus } from '../../entities/offer.entity';
import { Product } from '../../entities/product.entity';
import { ChatService } from '../chat/chat.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private chatService: ChatService, 
  ) {}

  // 1. İLK TEKLİF OLUŞTURMA (Her zaman Alıcı yapar)
  async createOffer(userId: string, dto: CreateOfferDto): Promise<Offer> {
    const product = await this.productRepository.findOne({ where: { id: dto.productId } });

    if (!product) throw new NotFoundException('Ürün bulunamadı');
    if (product.sellerId === userId) throw new BadRequestException('Kendi ürününüze teklif veremezsiniz');
    if (product.status === 'sold') throw new BadRequestException('Bu ürün satılmıştır');

    // Aktif bir süreç var mı kontrol et
    const activeOffer = await this.offerRepository.findOne({
      where: {
        productId: dto.productId,
        buyerId: userId,
        status: OfferStatus.PENDING
      }
    });

    if (activeOffer) {
      throw new BadRequestException('Zaten açık bir teklif süreciniz var.');
    }

    const offer = this.offerRepository.create({
      buyerId: userId,
      sellerId: product.sellerId,
      productId: dto.productId,
      offerAmount: dto.amount,
      makerId: userId, // ✅ İlk teklifi yapan: Alıcı
      status: OfferStatus.PENDING
    });

    const savedOffer = await this.offerRepository.save(offer);

    // Bildirim (Async)
    this.notifyUser(userId, product.sellerId, product.id, `💰 TEKLİF: ${dto.amount} TL teklif verdim.`);

    return savedOffer;
  }

  // 2. KARŞI TEKLİF (Satıcı -> Alıcıya VEYA Alıcı -> Satıcıya)
  async counterOffer(userId: string, originalOfferId: string, newAmount: number): Promise<Offer> {
    const originalOffer = await this.offerRepository.findOne({ where: { id: originalOfferId } });
    if (!originalOffer) throw new NotFoundException('Orijinal teklif bulunamadı');

    // Yetki: Sadece bu sürecin tarafları karşı teklif verebilir
    if (userId !== originalOffer.sellerId && userId !== originalOffer.buyerId) {
      throw new ForbiddenException('Bu teklife müdahale yetkiniz yok');
    }

    // Durum: Sadece 'pending' olan bir teklife karşılık verilebilir
    if (originalOffer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Bu teklif artık aktif değil.');
    }

    originalOffer.status = OfferStatus.COUNTERED;
    await this.offerRepository.save(originalOffer);

    //  YENİ TEKLİF OLUŞTUR
    const newOffer = this.offerRepository.create({
      buyerId: originalOffer.buyerId,   // Roller asla değişmez
      sellerId: originalOffer.sellerId, // Roller asla değişmez
      productId: originalOffer.productId,
      offerAmount: newAmount,
      makerId: userId, // ✅ Yeni teklifi yapan: Şu anki kullanıcı
      status: OfferStatus.PENDING
    });

    const savedOffer = await this.offerRepository.save(newOffer);

    // Hedef kişiyi bul (Ben seller isem -> buyer, Ben buyer isem -> seller)
    const targetUserId = userId === originalOffer.sellerId ? originalOffer.buyerId : originalOffer.sellerId;
    
    this.notifyUser(userId, targetUserId, originalOffer.productId, `🔄 KARŞI TEKLİF: ${newAmount} TL.`);

    return savedOffer;
  }

  // 3. GELEN KUTUSU (Cevaplamam Gerekenler)
  // Mantık: Benim tarafımda olan ama benim yapmadığım (maker != me) teklifler
  async getOffersReceived(userId: string): Promise<Offer[]> {
    return this.offerRepository.find({
      where: [
        // Senaryo A: Ben Satıcıyım, Alıcı teklif yapmış (Maker != Ben)
        { sellerId: userId, makerId: Not(userId), status: OfferStatus.PENDING },
        
        // Senaryo B: Ben Alıcıyım, Satıcı karşı teklif yapmış (Maker != Ben)
        { buyerId: userId, makerId: Not(userId), status: OfferStatus.PENDING }
      ],
      relations: ['product', 'buyer', 'product.images', 'product.seller'], // İlişkileri eksiksiz çekelim
      order: { createdAt: 'DESC' }
    });
  }

  // 4. GİDEN KUTUSU (Benim Yaptıklarım ve Cevap Bekleyenler)
  async getOffersMade(userId: string): Promise<Offer[]> {
    return this.offerRepository.find({
      where: {
        makerId: userId, // ✅ Teklifi ben yapmışım
        status: OfferStatus.PENDING
      },
      relations: ['product', 'buyer', 'product.images', 'product.seller'],
      order: { createdAt: 'DESC' }
    });
  }

  // 5. KABUL / RED
  async respondToOffer(userId: string, offerId: string, status: OfferStatus.ACCEPTED | OfferStatus.REJECTED) {
    const offer = await this.offerRepository.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadı');

    // Sadece hedef kişi cevaplayabilir. (Maker ben değilsem)
    if (offer.makerId === userId) {
      throw new BadRequestException('Kendi teklifinizi cevaplayamazsınız.');
    }

    offer.status = status;
    await this.offerRepository.save(offer);

    const targetUserId = userId === offer.sellerId ? offer.buyerId : offer.sellerId;
    const msg = status === OfferStatus.ACCEPTED ? '✅ Teklif KABUL edildi!' : '❌ Teklif reddedildi.';
    
    this.notifyUser(userId, targetUserId, offer.productId, msg);

    return offer;
  }

  // Yardımcı
  private async notifyUser(senderId: string, receiverId: string, productId: string, message: string) {
    try {
        const chat = await this.chatService.createOrGetChat(senderId, receiverId, productId);
        await this.chatService.sendMessage(chat.id, senderId, message);
    } catch (e) { console.error("Bildirim hatası", e); }
  }
}