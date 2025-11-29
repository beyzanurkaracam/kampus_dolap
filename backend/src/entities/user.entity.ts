import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { University } from './university.entity';
import { Product } from './product.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  profilePhoto: string;

  @ManyToOne(() => University, (university) => university.users)
  @JoinColumn({ name: 'universityId' })
  university: University;

  @Column()
  universityId: string;

  @Column({ nullable: true })
  studentId: string;

  @Column({ nullable: true })
  department: string; // Bölüm bilgisi

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verificationCode: string; // Email doğrulama kodu

  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiry: Date; // Kod son kullanma tarihi

  @Column({ default: false })
  emailVerified: boolean; // Email doğrulanmış mı

  @Column({ type: 'enum', enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  verificationStatus: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: ['USER', 'ADMIN'], default: 'USER' })
  role: string;

  @OneToMany(() => Product, (product) => product.seller)
  products: Product[];


  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
