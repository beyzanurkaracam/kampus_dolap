import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // ✅ EKLE

import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { Chat } from '../../entities/chat.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, User, Product]),
    ConfigModule, 
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({ 
        secret: configService.get('JWT_SECRET') || 'your-super-secret-key-change-this',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService], 
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}