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
  
  // ✅ DEBUG: Response'u konsola yazdır
  console.log('📤 API Response:', JSON.stringify(chats.map(c => ({
    id: c.id,
    product: c.product ? {
      id: c.product.id,
      title: c.product.title,
      images: c.product.images?.map(img => ({
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary
      }))
    } : null
  })), null, 2));
  
  return chats;
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

    // Kendisiyle sohbet başlatmaya çalışıyor mu?
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