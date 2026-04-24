// backend/src/entities/comment.entity.ts

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
  import { Product } from './product.entity';
  
  @Entity('comments')
  @Index(['productId', 'isPublic']) // Herkese açık yorumları hızlı çekmek için
  export class Comment {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    // ── İÇERİK ──
    @Column('text')
    content: string;
  
    // ── GİZLİLİK KONTROLÜ ──
    // Varsayılan: gizli (false). Satıcı yanıt verince true olur.
    @Column({ default: false })
    isPublic: boolean;
  
    // ── ÜRÜN İLİŞKİSİ ──
    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: Product;
  
    @Column()
    productId: string;
  
    // ── YORUM YAPAN (Alıcı veya Satıcı — yanıt verirken satıcı da yazar) ──
    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'authorId' })
    author: User;
  
    @Column()
    authorId: string;
  
    // ── THREAD SAHİBİ (Ana yorumu başlatan alıcı) ──
    // Kök yorumda threadStarterId = authorId olur.
    // Yanıtlarda da aynı değer taşınır → yetki kontrolünde kullanılır.
    @Column()
    threadStarterId: string;
  
    // ── ÜRÜN SAHİBİ (Satıcı — denormalize; yetki kontrolünde hız kazandırır) ──
    @Column()
    sellerId: string;
  
    // ── PARENT-CHILD (Thread yapısı) ──
    @ManyToOne(() => Comment, (comment) => comment.replies, {
      nullable: true,
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'parentId' })
    parent: Comment;
  
    @Column({ nullable: true })
    parentId: string | null;
  
    @OneToMany(() => Comment, (comment) => comment.parent)
    replies: Comment[];
  
    // ── ZAMAN DAMGALARI ──
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }