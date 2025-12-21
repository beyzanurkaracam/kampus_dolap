import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from './user.entity';

export enum MessageType {
  TEXT = 'text',
  PRODUCT = 'product', // ✅ Ürün bilgisi mesajı
  IMAGE = 'image',
  SYSTEM = 'system',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chat, chat => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  chatId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  // ✅ Ürün bilgisi için metadata (JSON olarak sakla)
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    productId?: string;
    productTitle?: string;
    productPrice?: number;
    productImage?: string;
  };

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}