import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtGuard } from '../guards/jwt.guard';

@Controller('chats')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getUserChats(@Req() req: any) {
    const chats = await this.chatService.getUserChats(req.user.id);
    
    const sanitizedChats = chats.map(chat => ({
      id: chat.id,
      buyerId: chat.buyerId,
      sellerId: chat.sellerId,
      lastMessage: chat.lastMessage,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
      
      // İlişkileri sadece gerekli verilerle sınırla
      buyer: {
        id: chat.buyer.id,
        fullName: chat.buyer.fullName,
        email: chat.buyer.email,
        profilePhoto: chat.buyer.profilePhoto
      },
      seller: {
        id: chat.seller.id,
        fullName: chat.seller.fullName,
        email: chat.seller.email,
        profilePhoto: chat.seller.profilePhoto
      },
      product: chat.product ? {
        id: chat.product.id,
        title: chat.product.title,
        price: chat.product.price,
        // Resimleri de sadeleştir
        images: chat.product.images?.map(img => ({
            id: img.id,
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary
        })) || []
      } : null
    }));

    // Konsola basıp kontrol edelim
    // console.log('📤 API Response Hazırlandı:', sanitizedChats.length, 'adet sohbet.');
    
    return sanitizedChats;
  }

  // Yeni sohbet başlat
  @Post()
  async createChat(
    @Body('sellerId') sellerId: string,
    @Body('productId') productId: string,
    @Request() req
  ) {
    if (!sellerId || !productId) {
      throw new BadRequestException('sellerId ve productId gerekli');
    }

    if (sellerId === req.user.userId) {
      throw new BadRequestException('Kendi ürününüzle mesajlaşamazsınız');
    }

    return this.chatService.createOrGetChat(req.user.userId, sellerId, productId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  // Sohbet mesajlarını getir
  @Get(':id/messages')
  async getChatMessages(@Param('id') chatId: string, @Request() req) {
    return this.chatService.getChatMessages(chatId, req.user.userId);
  }

  // Mesajları okundu işaretle
  @Post(':id/read')
  async markAsRead(@Param('id') chatId: string, @Request() req) {
    await this.chatService.markAsRead(chatId, req.user.userId);
    return { success: true };
  }
}