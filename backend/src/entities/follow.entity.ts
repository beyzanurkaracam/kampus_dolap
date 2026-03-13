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
  
  @Entity('follows')
  // Bir kişi aynı kişiyi tekrar takip edemesin diye 'followerId' ve 'followingId' çiftini benzersiz (unique) yapıyoruz.
  @Index(['followerId', 'followingId'], { unique: true })
  export class Follow {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    followerId: string; // Takip Eden
  
    @Column()
    followingId: string; // Takip Edilen
  
    // İlişkiler
    @ManyToOne(() => User, (user) => user.following, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followerId' })
    follower: User;
  
    @ManyToOne(() => User, (user) => user.followers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followingId' })
    following: User;
  
    @CreateDateColumn()
    createdAt: Date;
  }