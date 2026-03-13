import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Chat } from '../../entities/chat.entity';
import { Message, MessageType } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Product) private productRepository: Repository<Product>,
  ) {}

  async createOrGetChat(buyerId: string, sellerId: string, productId?: string): Promise<Chat> {
    if (buyerId === sellerId) {
      throw new BadRequestException('Kendi kendinize mesaj gönderemezsiniz');
    }

    // İki kullanıcı arasında mevcut sohbet var mı kontrol et
    let chat = await this.chatRepository.findOne({
      where: [
        { buyerId, sellerId },
        { buyerId: sellerId, sellerId: buyerId }
      ],
      relations: ['buyer', 'seller', 'product', 'product.images']
    });

    // Sohbet yoksa oluştur
    if (!chat) {
      chat = await this.chatRepository.save(
        this.chatRepository.create({ 
          buyerId, 
          sellerId, 
          productId
        })
      );

      // Oluşturduktan sonra ilişkileri yükle
      const loadedChat = await this.chatRepository.findOne({
        where: { id: chat.id },
        relations: ['buyer', 'seller', 'product', 'product.images']
      });

      // Null kontrolü ekle
      if (!loadedChat) {
        throw new NotFoundException('Sohbet oluşturulamadı');
      }

      chat = loadedChat;
    } else {
      //  Sohbet varsa ve yeni bir ürün bilgisi varsa, güncelle
      if (productId && chat.productId !== productId) {
        await this.chatRepository.update(chat.id, { productId });
        
        // Güncellenmiş sohbeti yeniden yükle
        const updatedChat = await this.chatRepository.findOne({
          where: { id: chat.id },
          relations: ['buyer', 'seller', 'product', 'product.images']
        });

        // ✅ Null kontrolü ekle
        if (!updatedChat) {
          throw new NotFoundException('Sohbet güncellenemedi');
        }

        chat = updatedChat;
      }
    }

    // Ürün bilgisi varsa otomatik mesaj gönder
    if (productId) {
      await this.sendAutomaticProductMessage(chat, buyerId, productId);
    }

    return chat; // Artık chat kesinlikle Chat tipinde
  }

  private async sendAutomaticProductMessage(chat: Chat, senderId: string, productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images'],
    });

    if (!product) return;

    const primaryImage = product.images?.find(img => img.isPrimary)?.imageUrl || 
                         product.images?.[0]?.imageUrl;

    const content = `📦 Ürün: ${product.title}\n💰 Fiyat: ${product.price} ₺\n\nMerhaba, bu ürün hakkında bilgi alabilir miyim?`;
    
    const message = this.messageRepository.create({
      chatId: chat.id,
      senderId,
      content,
      type: MessageType.PRODUCT,
      metadata: {
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price,
        productImage: primaryImage,
      },
    });

    await this.messageRepository.save(message);

    await this.chatRepository.update(chat.id, {
      lastMessage: `${product.title} hakkında sordu`,
      updatedAt: new Date()
    });
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      relations: ['buyer', 'seller', 'product', 'product.images'], 
      order: { updatedAt: 'DESC' }
    });
  }

  async getChatById(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['buyer', 'seller', 'product', 'product.images'],
    });

    if (!chat) throw new NotFoundException('Sohbet bulunamadı');
    if (chat.buyerId !== userId && chat.sellerId !== userId) {
      throw new BadRequestException('Bu sohbete erişim yetkiniz yok');
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

  async sendMessage(chatId: string, senderId: string, content: string): Promise<Message> {
    await this.getChatById(chatId, senderId);

    const message = await this.messageRepository.save(
      this.messageRepository.create({ 
        chatId, 
        senderId, 
        content: content.trim(),
        type: MessageType.TEXT,
      })
    );

    await this.chatRepository.update(chatId, {
      lastMessage: content.substring(0, 100),
      updatedAt: new Date()
    });

    const savedMessage = await this.messageRepository.findOne({
      where: { id: message.id },
      relations: ['sender']
    });

    if (!savedMessage) {
      throw new NotFoundException('Mesaj kaydedilemedi');
    }

    return savedMessage;
  }

  async markAsRead(chatId: string, userId: string): Promise<void> {
    await this.getChatById(chatId, userId);

    await this.messageRepository.update(
      { 
        chatId, 
        senderId: Not(userId),
        isRead: false 
      }, 
      { isRead: true }
    );
  }

  async getUnreadCount(userId: string): Promise<{ totalUnread: number }> {
    const chats = await this.getUserChats(userId);
    
    let totalUnread = 0;

    for (const chat of chats) {
      const unreadCount = await this.messageRepository.count({
        where: {
          chatId: chat.id,
          senderId: Not(userId),
          isRead: false,
        },
      });
      totalUnread += unreadCount;
    }

    return { totalUnread };
  }
}