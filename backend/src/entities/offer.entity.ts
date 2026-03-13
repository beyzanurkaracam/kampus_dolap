import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { CampusLocation } from './campus-location.entity'; // ✅ Import Ekle

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted', 
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COUNTERED = 'countered',
  MEETING_CONFIRMED = 'meeting_confirmed', 
}

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  offerAmount: number;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.PENDING,
  })
  status: OfferStatus;

  // ... (Diğer mevcut alanlar makerId, buyer, seller vs. aynı kalıyor) ...
  @Column({ nullable: true })
  makerId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column()
  sellerId: string;

  // ✅ YENİ ALANLAR: Buluşma Detayları
  @ManyToOne(() => CampusLocation, { nullable: true, eager: true })
  @JoinColumn({ name: 'meetingPointId' })
  meetingPoint: CampusLocation;

  @Column({ nullable: true })
  meetingPointId: string;

  @Column({ type: 'timestamp', nullable: true })
  meetingTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}