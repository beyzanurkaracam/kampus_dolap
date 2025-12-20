import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Chat } from '../../entities/chat.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // Kullanıcının tüm sohbetlerini getir
  async getUserChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: [
        { buyer: { id: userId } },
        { seller: { id: userId } },
      ],
      relations: ['buyer', 'seller', 'product', 'product.images'],
      order: { updatedAt: 'DESC' },
    });
  }

  // Yeni sohbet başlat veya mevcut sohbeti getir
  async createOrGetChat(buyerId: string, sellerId: string, productId: string): Promise<Chat> {
    // Mevcut sohbet var mı kontrol et
    let chat = await this.chatRepository.findOne({
      where: {
        buyer: { id: buyerId },
        seller: { id: sellerId },
        product: { id: productId },
      },
      relations: ['buyer', 'seller', 'product'],
    });

    if (chat) {
      return chat;
    }

    // Yeni sohbet oluştur
    const buyer = await this.userRepository.findOne({ where: { id: buyerId } });
    const seller = await this.userRepository.findOne({ where: { id: sellerId } });
    const product = await this.productRepository.findOne({ where: { id: productId } });

    if (!buyer || !seller || !product) {
      throw new NotFoundException('Kullanıcı veya ürün bulunamadı');
    }

    chat = this.chatRepository.create({
      buyer,
      seller,
      product,
      //lastMessage: null,
    });

    return this.chatRepository.save(chat);
  }

  // Sohbet mesajlarını getir
  async getChatMessages(chatId: string, userId: string): Promise<Message[]> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['buyer', 'seller'],
    });

    if (!chat) {
      throw new NotFoundException('Sohbet bulunamadı');
    }

    // Kullanıcı bu sohbete dahil mi kontrol et
    if (chat.buyer.id !== userId && chat.seller.id !== userId) {
      throw new NotFoundException('Bu sohbete erişim yetkiniz yok');
    }

    return this.messageRepository.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  // Mesaj gönder
  async sendMessage(chatId: string, senderId: string, content: string): Promise<Message> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['buyer', 'seller'],
    });

    if (!chat) {
      throw new NotFoundException('Sohbet bulunamadı');
    }

    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const message = this.messageRepository.create({
      chat,
      sender,
      content,
      isRead: false,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Chat'in lastMessage'ını güncelle
    chat.lastMessage = content;
    await this.chatRepository.save(chat);

    return savedMessage;
  }

  // Mesajları okundu işaretle
  async markAsRead(chatId: string, userId: string): Promise<void> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['buyer', 'seller'],
    });

    if (!chat) {
      throw new NotFoundException('Sohbet bulunamadı');
    }

    // Kullanıcı bu sohbete dahil mi?
    if (chat.buyer.id !== userId && chat.seller.id !== userId) {
      throw new ForbiddenException('Bu sohbete erişim yetkiniz yok');
    }

    // Karşı tarafın mesajlarını okundu yap (kendi mesajları değil)
    await this.messageRepository.update(
      { 
        chat: { id: chatId }, 
        sender: { id: Not(userId) }, // ✅ Sadece karşı tarafın mesajları
        isRead: false 
      },
      { isRead: true }
    );
  }
  async getUnreadCount(userId: string): Promise<{ totalUnread: number; chatUnreads: any[] }> {
    const chats = await this.getUserChats(userId);
    
    const chatUnreads = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await this.messageRepository.count({
          where: {
            chat: { id: chat.id },
            sender: { id: Not(userId) },
            isRead: false,
          },
        });

        return {
          chatId: chat.id,
          unreadCount,
        };
      })
    );

    const totalUnread = chatUnreads.reduce((sum, item) => sum + item.unreadCount, 0);

    return {
      totalUnread,
      chatUnreads: chatUnreads.filter(item => item.unreadCount > 0),
    };
  }
}