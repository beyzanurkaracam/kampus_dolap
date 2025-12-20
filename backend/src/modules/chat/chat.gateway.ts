import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../../entities/chat.entity';
import { RedisService } from '../redis/redis.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

@WebSocketGateway({ 
  cors: { 
    origin: ['http://10.0.2.2:8081', 'http://localhost:8081'],
    credentials: true 
  },
  namespace: '/chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly MAX_MESSAGES_PER_MINUTE = 20;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new UnauthorizedException('Token bulunamadı');
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userEmail = payload.email;

      // ✅ Redis'e online status kaydet
      await this.redisService.hset(`user:${client.userId}`, 'status', 'online');
      await this.redisService.hset(`user:${client.userId}`, 'lastSeen', Date.now().toString());
      await this.redisService.hset(`user:${client.userId}`, 'socketId', client.id);

      console.log(`✅ Client authenticated: ${client.id} (User: ${client.userId})`);
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    
    if (client.userId) {
      // ✅ Redis'te offline status güncelle
      await this.redisService.hset(`user:${client.userId}`, 'status', 'offline');
      await this.redisService.hset(`user:${client.userId}`, 'lastSeen', Date.now().toString());
      await this.redisService.hdel(`user:${client.userId}`, 'socketId');
    }
  }

  private async validateChatAccess(chatId: string, userId: string): Promise<void> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['buyer', 'seller'],
    });

    if (!chat) {
      throw new BadRequestException('Sohbet bulunamadı');
    }

    if (chat.buyer.id !== userId && chat.seller.id !== userId) {
      throw new ForbiddenException('Bu sohbete erişim yetkiniz yok');
    }
  }

  // ✅ Redis ile Rate Limiting
  private async checkRateLimit(userId: string): Promise<void> {
    const key = `rate_limit:${userId}`;
    const count = await this.redisService.incr(key);
    
    if (count === 1) {
      await this.redisService.expire(key, 60); // 1 dakika
    }
    
    if (count > this.MAX_MESSAGES_PER_MINUTE) {
      const ttl = await this.redisService.ttl(key);
      throw new BadRequestException(`Çok fazla mesaj gönderdiniz. ${ttl} saniye bekleyin.`);
    }
  }

  private validateMessage(content: string): string {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException('Geçersiz mesaj içeriği');
    }

    const trimmed = content.trim();

    if (trimmed.length === 0) {
      throw new BadRequestException('Mesaj boş olamaz');
    }

    if (trimmed.length > 1000) {
      throw new BadRequestException('Mesaj çok uzun (max 1000 karakter)');
    }

    return trimmed.replace(/<[^>]*>/g, '');
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() chatId: string
  ) {
    try {
      if (!client.userId) {
        throw new UnauthorizedException('Kimlik doğrulaması gerekli');
      }

      await this.validateChatAccess(chatId, client.userId);
      client.join(chatId);

      // ✅ Redis'te aktif sohbeti kaydet
      await this.redisService.sadd(`user:${client.userId}:chats`, chatId);

      console.log(`✅ User ${client.userId} joined chat ${chatId}`);
      return { success: true, message: 'Sohbete katıldınız' };
    } catch (error) {
      console.error('❌ Join chat error:', error.message);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() chatId: string
  ) {
    client.leave(chatId);
    
    // ✅ Redis'ten aktif sohbeti kaldır
    if (client.userId) {
      await this.redisService.srem(`user:${client.userId}:chats`, chatId);
    }
    
    console.log(`👋 User ${client.userId} left chat ${chatId}`);
  }

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; content: string }
  ) {
    try {
      if (!client.userId) {
        throw new UnauthorizedException('Kimlik doğrulaması gerekli');
      }

      // ✅ Redis rate limiting
      await this.checkRateLimit(client.userId);

      const sanitizedContent = this.validateMessage(data.content);
      await this.validateChatAccess(data.chatId, client.userId);

      const message = await this.chatService.sendMessage(
        data.chatId,
        client.userId,
        sanitizedContent
      );

      const messagePayload = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          fullName: message.sender.fullName,
        },
      };

      // ✅ Redis'e son mesajı cache'le
      await this.redisService.setex(
        `chat:${data.chatId}:lastMessage`,
        3600, // 1 saat
        JSON.stringify(messagePayload)
      );

      // Sohbetteki herkese gönder
      this.server.to(data.chatId).emit('chat:newMessage', messagePayload);

      return { success: true };
    } catch (error) {
      console.error('❌ Send message error:', error.message);
      
      client.emit('chat:error', { 
        message: error.message,
        code: error.status || 500
      });

      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string }
  ) {
    try {
      if (!client.userId) return;

      await this.validateChatAccess(data.chatId, client.userId);

      // ✅ Redis'e typing status kaydet (5 saniye TTL)
      const typingKey = `chat:${data.chatId}:typing:${client.userId}`;
      await this.redisService.setex(typingKey, 5, '1');

      client.to(data.chatId).emit('chat:userTyping', {
        userId: client.userId,
        userEmail: client.userEmail,
      });
    } catch (error) {
      console.error('❌ Typing indicator error:', error.message);
    }
  }

  @SubscribeMessage('chat:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string }
  ) {
    try {
      if (!client.userId) return;

      await this.validateChatAccess(data.chatId, client.userId);
      await this.chatService.markAsRead(data.chatId, client.userId);

      // ✅ Redis'ten unread count'u temizle
      await this.redisService.hdel(`unread:${client.userId}`, data.chatId);

      client.to(data.chatId).emit('chat:messagesRead', {
        userId: client.userId,
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Mark as read error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ✅ Yeni: Online status kontrolü
  @SubscribeMessage('user:status')
  async handleGetUserStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() userId: string
  ) {
    try {
      const status = await this.redisService.hget(`user:${userId}`, 'status');
      const lastSeen = await this.redisService.hget(`user:${userId}`, 'lastSeen');

      return {
        success: true,
        data: {
          userId,
          status: status || 'offline',
          lastSeen: lastSeen ? parseInt(lastSeen) : null,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}