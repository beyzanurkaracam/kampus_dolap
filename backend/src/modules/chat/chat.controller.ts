import { Controller, Get, Post, Param, UseGuards, Request, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtGuard } from '../guards/jwt.guard';

@Controller('chats')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getUserChats(@Req() req: any) {
    const userId = req.user.userId ?? req.user.id;
    const chats = await this.chatService.getUserChats(userId);

    return chats.map((chat) => ({
      id: chat.id,
      buyerId: chat.buyerId,
      sellerId: chat.sellerId,
      lastMessage: chat.lastMessage,
      firstMessageSent: chat.firstMessageSent,
      originOfferId: chat.originOfferId,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
      buyer: {
        id: chat.buyer.id,
        fullName: chat.buyer.fullName,
        email: chat.buyer.email,
        profilePhoto: chat.buyer.profilePhoto,
      },
      seller: {
        id: chat.seller.id,
        fullName: chat.seller.fullName,
        email: chat.seller.email,
        profilePhoto: chat.seller.profilePhoto,
      },
      product: chat.product
        ? {
            id: chat.product.id,
            title: chat.product.title,
            price: chat.product.price,
            status: chat.product.status,
            images:
              chat.product.images?.map((img) => ({
                id: img.id,
                imageUrl: img.imageUrl,
                isPrimary: img.isPrimary,
              })) || [],
          }
        : null,
    }));
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @Get(':id')
  async getChatDetail(@Param('id') chatId: string, @Request() req) {
    const chat = await this.chatService.getChatById(chatId, req.user.userId);
    return {
      id: chat.id,
      buyerId: chat.buyerId,
      sellerId: chat.sellerId,
      firstMessageSent: chat.firstMessageSent,
      originOfferId: chat.originOfferId,
      product: chat.product
        ? {
            id: chat.product.id,
            title: chat.product.title,
            price: chat.product.price,
            status: chat.product.status,
            images: chat.product.images || [],
          }
        : null,
    };
  }

  @Get(':id/messages')
  async getChatMessages(@Param('id') chatId: string, @Request() req) {
    return this.chatService.getChatMessages(chatId, req.user.userId);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') chatId: string, @Request() req) {
    await this.chatService.markAsRead(chatId, req.user.userId);
    return { success: true };
  }
}
