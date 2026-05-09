import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Chat } from '../../entities/chat.entity';
import { Message, MessageType } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Offer } from '../../entities/offer.entity';
import { BlockService } from '../block/block.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Product) private productRepository: Repository<Product>,
    private blockService: BlockService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Chat sadece teklif kabul edildiğinde açılır.
  // Aynı (buyer, seller, product) kombinasyonu için tek chat tutulur.
  // ─────────────────────────────────────────────────────────────
  async openChatForAcceptedOffer(offer: Offer): Promise<Chat> {
    let chat = await this.chatRepository.findOne({
      where: [
        { buyerId: offer.buyerId, sellerId: offer.sellerId, productId: offer.productId },
        { buyerId: offer.sellerId, sellerId: offer.buyerId, productId: offer.productId },
      ],
    });

    if (!chat) {
      chat = await this.chatRepository.save(
        this.chatRepository.create({
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          productId: offer.productId,
          originOfferId: offer.id,
          firstMessageSent: false,
        }),
      );
    } else {
      // Yeni süreç başladıysa input kilidini tekrar etkinleştir.
      await this.chatRepository.update(chat.id, {
        firstMessageSent: false,
        originOfferId: offer.id,
        productId: offer.productId,
      });
      chat.firstMessageSent = false;
      chat.originOfferId = offer.id;
    }

    return chat;
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      relations: ['buyer', 'seller', 'product', 'product.images'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getChatById(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['buyer', 'seller', 'product', 'product.images'],
    });
    if (!chat) throw new NotFoundException('Sohbet bulunamadı');
    if (chat.buyerId !== userId && chat.sellerId !== userId) {
      throw new ForbiddenException('Bu sohbete erişim yetkiniz yok');
    }
    return chat;
  }

  async getChatMessages(chatId: string, userId: string): Promise<Message[]> {
    await this.getChatById(chatId, userId);
    return this.messageRepository.find({
      where: { chatId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Mesaj gönderim kuralı (Altın Yol):
  //   • Sohbeti SADECE teklif kabul edilince açılır.
  //   • İlk mesajı SADECE satıcı atabilir.
  //   • Engelli kullanıcılar mesajlaşamaz.
  // ─────────────────────────────────────────────────────────────
  async sendMessage(chatId: string, senderId: string, content: string): Promise<Message> {
    const chat = await this.getChatById(chatId, senderId);

    if (await this.blockService.isEitherBlocked(chat.buyerId, chat.sellerId)) {
      throw new ForbiddenException('Bu sohbet engellendiği için mesaj gönderemezsiniz.');
    }

    if (!chat.firstMessageSent && senderId !== chat.sellerId) {
      throw new ForbiddenException('İlk mesajı satıcının atması gerekiyor.');
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        chatId,
        senderId,
        content: content.trim(),
        type: MessageType.TEXT,
      }),
    );

    const updates: Partial<Chat> = {
      lastMessage: content.substring(0, 100),
      updatedAt: new Date(),
    };
    if (!chat.firstMessageSent && senderId === chat.sellerId) {
      updates.firstMessageSent = true;
    }
    await this.chatRepository.update(chatId, updates);

    const saved = await this.messageRepository.findOne({
      where: { id: message.id },
      relations: ['sender'],
    });
    if (!saved) throw new NotFoundException('Mesaj kaydedilemedi');
    return saved;
  }

  async markAsRead(chatId: string, userId: string): Promise<void> {
    await this.getChatById(chatId, userId);
    await this.messageRepository.update(
      { chatId, senderId: Not(userId), isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<{ totalUnread: number }> {
    const chats = await this.getUserChats(userId);
    let totalUnread = 0;
    for (const chat of chats) {
      const c = await this.messageRepository.count({
        where: { chatId: chat.id, senderId: Not(userId), isRead: false },
      });
      totalUnread += c;
    }
    return { totalUnread };
  }

  // Block/iptal akışlarında dışarıdan kullanılır.
  async lockChatBetween(userAId: string, userBId: string): Promise<void> {
    const chats = await this.chatRepository.find({
      where: [
        { buyerId: userAId, sellerId: userBId },
        { buyerId: userBId, sellerId: userAId },
      ],
    });
    if (chats.length === 0) return;
    for (const chat of chats) {
      chat.firstMessageSent = false;
    }
    await this.chatRepository.save(chats);
  }
}
