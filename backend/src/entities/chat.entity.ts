import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';
import { Product } from './product.entity';

@Entity('chats')
@Index(['buyerId', 'sellerId'])
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  sellerId: string;

  @Column({ nullable: true })
  lastMessage: string;

  // Altın Yol: Chat ancak teklif kabul edilince açılır.
  // İlk mesajı SADECE satıcı atabilir; satıcı ilk mesajı yollayana kadar alıcı yazamaz.
  @Column({ default: false })
  firstMessageSent: boolean;

  // Hangi tekliften açıldı (history / iptal akışları için).
  @Column({ nullable: true })
  originOfferId: string;

  @OneToMany(() => Message, (message) => message.chat, { cascade: true })
  messages: Message[];

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
