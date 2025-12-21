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

  @OneToMany(() => Message, message => message.chat, { cascade: true })
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
   @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' }) // Ürün silinirse sohbet kalır ama ürün bilgisi boşalır
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productId: string;
}