import { 
  BadRequestException, 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm'; 
import { Offer, OfferStatus } from '../../entities/offer.entity';
import { Product } from '../../entities/product.entity';
import { ChatService } from '../chat/chat.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CampusLocation } from 'src/entities/campus-location.entity';
import { AcceptOfferDto } from './dto/accept-offer.dto';

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private chatService: ChatService, 
    @InjectRepository(CampusLocation) 
    private locationRepository: Repository<CampusLocation>
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
      makerId: userId, 
      status: OfferStatus.PENDING
    });

    const savedOffer = await this.offerRepository.save(offer);

    // Bildirim (Async)
    this.notifyUser(userId, product.sellerId, product.id, `💰 TEKLİF: ${dto.amount} TL teklif verdim.`);

    return savedOffer;
  }

// backend/src/modules/offer/offer.service.ts içindeki counterOffer metodunu değiştir

async counterOffer(
  userId: string, 
  originalOfferId: string, 
  newAmount: number,
  meetingPointId?: string,
  meetingTime?: string
): Promise<Offer> {
  const originalOffer = await this.offerRepository.findOne({ 
    where: { id: originalOfferId },
    relations: ['meetingPoint']
  });
  if (!originalOffer) throw new NotFoundException('Orijinal teklif bulunamadı');

  if (userId !== originalOffer.sellerId && userId !== originalOffer.buyerId) {
    throw new ForbiddenException('Bu teklife müdahale yetkiniz yok');
  }

  if (originalOffer.status !== OfferStatus.PENDING && originalOffer.status !== OfferStatus.ACCEPTED) {
    throw new BadRequestException('Bu teklif artık aktif değil.');
  }

  const previousStatus = originalOffer.status;
  const isPriceSame = Number(newAmount) === Number(originalOffer.offerAmount);
  
  // ✅ DÜZELTME: Mesaj içeriği mantığı düzeltildi
  const isMeetingChangeOnly = previousStatus === OfferStatus.ACCEPTED && isPriceSame && meetingPointId && meetingTime;
  const hasMeetingInfo = meetingPointId && meetingTime;

  // Eski teklifi COUNTERED yap
  originalOffer.status = OfferStatus.COUNTERED;
  await this.offerRepository.save(originalOffer);

  // YENİ TEKLİF OLUŞTUR
  const newOffer = this.offerRepository.create({
    buyerId: originalOffer.buyerId,
    sellerId: originalOffer.sellerId,
    productId: originalOffer.productId,
    offerAmount: newAmount,
    makerId: userId,
    status: OfferStatus.PENDING 
  });

  // Buluşma bilgisi varsa ekle
  if (hasMeetingInfo) {
    const location = await this.locationRepository.findOne({ where: { id: meetingPointId } });
    if (!location) throw new NotFoundException('Seçilen buluşma noktası geçersiz.');
    
    newOffer.meetingPointId = meetingPointId;
    newOffer.meetingTime = new Date(meetingTime);
  }

  const savedOffer = await this.offerRepository.save(newOffer);

  // ✅ DÜZELTME: Mesaj içeriği - Kim kime ne gönderiyor?
  let messageContent = '';
  const iAmBuyer = userId === originalOffer.buyerId;
  const targetName = iAmBuyer ? 'Satıcı' : 'Alıcı';

  if (isMeetingChangeOnly) {
    // ACCEPTED durumundan gelip sadece buluşma değiştiriyoruz
    const location = await this.locationRepository.findOne({ where: { id: meetingPointId } });
    const meetingDate = new Date(meetingTime);
    const dateStr = meetingDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const timeStr = meetingDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    messageContent = `📍 BULUŞMA DEĞİŞİKLİĞİ ÖNERİSİ\n\nFiyat: ${newAmount} ₺ (Değişmedi)\n📍 Yeni Yer: ${location?.name}\n📅 Yeni Zaman: ${dateStr} - ${timeStr}\n\nOnaylayın veya başka bir yer/zaman önerin.`;
  } 
  else if (hasMeetingInfo && !isPriceSame) {
    // Hem fiyat hem buluşma bilgisi var
    const location = await this.locationRepository.findOne({ where: { id: meetingPointId } });
    const meetingDate = new Date(meetingTime);
    const dateStr = meetingDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const timeStr = meetingDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    messageContent = `🔄 ${iAmBuyer ? 'Alıcı' : 'Satıcı'} KARŞI TEKLİF\n\nYeni Fiyat: ${newAmount} ₺\n📍 Önerilen Yer: ${location?.name}\n📅 Önerilen Zaman: ${dateStr} - ${timeStr}\n\nKabul ederseniz anlaşma tamamlanır.`;
  }
  else if (hasMeetingInfo && isPriceSame) {
    // Sadece buluşma bilgisi var, fiyat aynı (İlk kabul)
    const location = await this.locationRepository.findOne({ where: { id: meetingPointId } });
    const meetingDate = new Date(meetingTime);
    const dateStr = meetingDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const timeStr = meetingDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    messageContent = `✅ ${iAmBuyer ? 'Alıcı' : 'Satıcı'} KABUL ETTİ\n\nFiyat: ${newAmount} ₺\n📍 Önerilen Yer: ${location?.name}\n📅 Önerilen Zaman: ${dateStr} - ${timeStr}\n\nOnaylarsanız buluşma kesinleşir.`;
  }
  else {
    // Sadece fiyat değişikliği
    messageContent = `🔄 ${iAmBuyer ? 'Alıcı' : 'Satıcı'} KARŞI TEKLİF: ${newAmount} ₺`;
  }

  const targetUserId = userId === originalOffer.sellerId ? originalOffer.buyerId : originalOffer.sellerId;
  this.notifyUser(userId, targetUserId, originalOffer.productId, messageContent);

  return savedOffer;
}


// 5. KABUL / RED GÜNCELLEMESİ
async respondToOffer(userId: string, offerId: string, status: OfferStatus.ACCEPTED | OfferStatus.REJECTED) {
  const offer = await this.offerRepository.findOne({ where: { id: offerId } });
  if (!offer) throw new NotFoundException('Teklif bulunamadı');

  if (offer.makerId === userId) {
    throw new BadRequestException('Kendi teklifinizi cevaplayamazsınız.');
  }

  // 🔥 DÜZELTME: Eğer reddediliyorsa, ACCEPTED durumundaki bir teklif de reddedilebilmeli (Vazgeçme hakkı).
  if (status === OfferStatus.REJECTED) {
       if (offer.status !== OfferStatus.PENDING && offer.status !== OfferStatus.ACCEPTED) {
           throw new BadRequestException('Bu teklif artık değiştirilemez.');
       }
  } else {
      // Kabul ediliyorsa pending olmalı
      if (offer.status !== OfferStatus.PENDING) {
           // throw new BadRequestException... (Burayı esnek bırakabilirsin)
      }
  }

  offer.status = status;
  await this.offerRepository.save(offer);

  const targetUserId = userId === offer.sellerId ? offer.buyerId : offer.sellerId;
  const msg = status === OfferStatus.ACCEPTED ? ' Teklif KABUL edildi!' : ' Teklif reddedildi / işlem iptal edildi.';
  
  this.notifyUser(userId, targetUserId, offer.productId, msg);

  return offer;
}
  // 3. GELEN KUTUSU (Cevaplamam Gerekenler)
  // Mantık: Benim tarafımda olan ama benim yapmadığım (maker != me) teklifler
  async getOffersReceived(userId: string): Promise<Offer[]> {
    return this.offerRepository.find({
      where: [
        // ✅ SENARYO A: Ben SATICI'yım, Alıcı teklif yapmış (PENDING veya ACCEPTED)
        { 
          sellerId: userId, 
          buyerId: Not(userId), // Alıcı ben değilim
          status: In([OfferStatus.PENDING, OfferStatus.ACCEPTED])
        },
        
        // ✅ SENARYO B: Ben ALICI'yım, SADECE ACCEPTED durumu için (Satıcı kabul etmiş)
        { 
          buyerId: userId, 
          sellerId: Not(userId), // Satıcı ben değilim
          status: OfferStatus.ACCEPTED // Kabul edilmiş olanlar
        },
        
        // ✅ SENARYO C: Ben ALICI'yım, Satıcı KARŞI TEKLİF yapmış (PENDING)
        { 
          buyerId: userId, 
          makerId: Not(userId), // Karşı teklifi satıcı yapmış
          status: OfferStatus.PENDING
        }
      ],
      relations: ['product', 'buyer', 'product.images', 'product.seller', 'meetingPoint'],
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


  // Yardımcı
  private async notifyUser(senderId: string, receiverId: string, productId: string, message: string) {
    try {
        const chat = await this.chatService.createOrGetChat(senderId, receiverId, productId);
        await this.chatService.sendMessage(chat.id, senderId, message);
    } catch (e) { console.error("Bildirim hatası", e); }
  }

  // backend/src/modules/offer/offer.service.ts içindeki acceptOfferWithMeeting metodunu değiştir

// backend/src/modules/offer/offer.service.ts içindeki acceptOfferWithMeeting metodunu değiştir

async acceptOfferWithMeeting(userId: string, offerId: string, dto: AcceptOfferDto) {
  const originalOffer = await this.offerRepository.findOne({ 
    where: { id: offerId },
    relations: ['meetingPoint', 'product'] 
  });
  if (!originalOffer) throw new NotFoundException('Teklif bulunamadı');

  if (originalOffer.makerId === userId) {
    throw new BadRequestException('Kendi teklifinizi kabul edemezsiniz.');
  }

  const location = await this.locationRepository.findOne({ where: { id: dto.meetingPointId } });
  if (!location) throw new NotFoundException('Seçilen buluşma noktası geçersiz.');

  // ✅ KONTROL: Eğer orijinal teklifteki mekan/saat ile şu an kabul edilen aynıysa, süreç BİTMİŞTİR.
  // Tarih karşılaştırması için time değerlerini alıyoruz
  const isTimeSame = originalOffer.meetingTime && new Date(originalOffer.meetingTime).getTime() === new Date(dto.meetingTime).getTime();
  const isLocationSame = originalOffer.meetingPointId === dto.meetingPointId;
  
  // Eğer karşı tarafın önerdiği yer ve saati birebir kabul ediyorsak -> KESİNLEŞTİR
  const isImmediateDeal = isTimeSame && isLocationSame;
  const newStatus = isImmediateDeal ? OfferStatus.MEETING_CONFIRMED : OfferStatus.ACCEPTED;

  // Eski teklifi COUNTERED yap
  originalOffer.status = OfferStatus.COUNTERED;
  await this.offerRepository.save(originalOffer);

  // Yeni teklif oluştur
  const newOffer = this.offerRepository.create({
    buyerId: originalOffer.buyerId,
    sellerId: originalOffer.sellerId,
    productId: originalOffer.productId,
    offerAmount: originalOffer.offerAmount,
    makerId: userId, // Kabul eden kişi
    status: newStatus, // ✅ Durum burada belirleniyor
    meetingPointId: dto.meetingPointId,
    meetingTime: new Date(dto.meetingTime),
    meetingPoint: location
  });

  const savedOffer = await this.offerRepository.save(newOffer);

  // ✅ Eğer süreç kesinleştiyse Ürünü REZERVE yap
  if (newStatus === OfferStatus.MEETING_CONFIRMED) {
     await this.productRepository.update(originalOffer.productId, { status: 'reserved' });
  }

  // Bildirim Mesajı Hazırla
  const meetingDate = new Date(savedOffer.meetingTime);
  const dateStr = meetingDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const timeStr = meetingDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const iAmBuyer = userId === savedOffer.buyerId;
  const whoAccepted = iAmBuyer ? 'Alıcı' : 'Satıcı';

  let message = '';
  if (newStatus === OfferStatus.MEETING_CONFIRMED) {
      message = `🤝 ANLAŞMA SAĞLANDI!\n\n${whoAccepted} önerilen yeri ve saati kabul etti.\nÜrün rezerveye alındı.\n📍 ${location.name}\n⏰ ${dateStr} - ${timeStr}`;
  } else {
      message = `✅ ${whoAccepted} Teklifi Kabul Etti!\n\nFiyat: ${savedOffer.offerAmount} ₺\n📍 Önerilen Yer: ${location.name}\n📅 Önerilen Zaman: ${dateStr} - ${timeStr}\n\nOnaylarsanız buluşma kesinleşir.`;
  }

  const targetUserId = userId === savedOffer.sellerId ? savedOffer.buyerId : savedOffer.sellerId;
  this.notifyUser(userId, targetUserId, savedOffer.productId, message);

  return savedOffer;
}
async confirmMeeting(userId: string, offerId: string) {
  const offer = await this.offerRepository.findOne({ 
    where: { id: offerId },
    relations: ['product', 'buyer', 'meetingPoint'] 
  });
  
  if (!offer) throw new NotFoundException('Teklif bulunamadı');

  
  if (offer.buyerId !== userId && offer.sellerId !== userId) {
    throw new ForbiddenException('Bu işlemi yapmaya yetkiniz yok. Sadece alıcı veya satıcı onaylayabilir.');
  }

  // Durum sadece ACCEPTED ise onaylanabilir
  if (offer.status !== OfferStatus.ACCEPTED) {
    throw new BadRequestException('Teklif henüz kabul edilmemiş veya zaten onaylanmış.');
  }

  // 1. Teklif Durumunu Güncelle
  offer.status = OfferStatus.MEETING_CONFIRMED;
  await this.offerRepository.save(offer);

  // 2. Ürün Durumunu REZERVE Yap
  const product = offer.product;
  product.status = 'reserved'; 
  await this.productRepository.save(product);

  // 3. Mesaj At (Karşı tarafa bildirim gönder)
  const dateStr = new Date(offer.meetingTime).toLocaleString('tr-TR');
  
  // İşlemi yapan kim? Karşı taraf kim?
  const isBuyerConfirming = userId === offer.buyerId;
  const targetUserId = isBuyerConfirming ? offer.sellerId : offer.buyerId;
  const confirmerName = isBuyerConfirming ? 'Alıcı' : 'Satıcı';

  const msg = `🤝 BULUŞMA KESİNLEŞTİ!\n\n${confirmerName} buluşmayı onayladı. Ürün rezerveye alındı. \n📍 ${offer.meetingPoint?.name}\n⏰ ${dateStr}\n\nLütfen zamanında orada olunuz.`;
  
  this.notifyUser(userId, targetUserId, offer.productId, msg);

  return { message: 'Buluşma onaylandı, iyi alışverişler!', offer };
}

}