// backend/src/entities/notification.entity.ts

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
  } from 'typeorm';
  import { User } from './user.entity';
  
  export enum NotificationType {
    COMMENT = 'comment',           // Ürüne yorum yapıldı
    COMMENT_REPLY = 'comment_reply', // Yoruma yanıt verildi
    OFFER = 'offer',               // Teklif geldi
    OFFER_ACCEPTED = 'offer_accepted',
    OFFER_REJECTED = 'offer_rejected',
    MEETING_CONFIRMED = 'meeting_confirmed',
    FOLLOW = 'follow',             // Biri seni takip etti
    SYSTEM = 'system',             // Sistem bildirimi
  }
  
  @Entity('notifications')
  @Index(['recipientId', 'isRead']) // Okunmamış bildirimleri hızlı çekmek için
  export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    // ── BİLDİRİMİ ALAN KİŞİ ──
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'recipientId' })
    recipient: User;
  
    @Column()
    recipientId: string;
  
    // ── BİLDİRİMİ TETİKLEYEN KİŞİ ──
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'senderId' })
    sender: User;
  
    @Column({ nullable: true })
    senderId: string;
  
    // ── BİLDİRİM İÇERİĞİ ──
    @Column({
      type: 'enum',
      enum: NotificationType,
      default: NotificationType.SYSTEM,
    })
    type: NotificationType;
  
    @Column()
    title: string;
  
    @Column('text')
    message: string;
  
    // ── İLGİLİ KAYNAK (Ürün, Teklif, vs.) ──
    @Column({ nullable: true })
    referenceId: string; // Örn: productId, offerId
  
    @Column({ nullable: true })
    referenceType: string; // 'product', 'offer', 'comment'
  
    // ── OKUNMA DURUMU ──
    @Column({ default: false })
    isRead: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  }