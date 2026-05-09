import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Offer } from './offer.entity';

// Satış sonrası alıcının satıcıya verdiği değerlendirme (1-5 yıldız + yorum).
// Tek bir teklif başına yalnızca bir değerlendirme yapılabilir.
@Entity('reviews')
@Unique(['offerId'])
@Index(['sellerId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  rating: number; // 1..5

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @ManyToOne(() => Offer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offerId' })
  offer: Offer;

  @Column()
  offerId: string;

  @CreateDateColumn()
  createdAt: Date;
}
