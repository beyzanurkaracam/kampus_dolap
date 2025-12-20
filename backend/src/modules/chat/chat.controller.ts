import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtGuard } from '../guards/jwt.guard';

@Controller('chats')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Kullanıcının sohbetlerini getir
  @Get()
  async getUserChats(@Request() req) {
    return this.chatService.getUserChats(req.user.userId);
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