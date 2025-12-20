import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Product } from "./product.entity";
import { Message } from "./message.entity";

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  buyer: User;

  @ManyToOne(() => User)
  seller: User;

  @ManyToOne(() => Product)
  product: Product;

  @OneToMany(() => Message, message => message.chat)
  messages: Message[];

  @Column({ nullable: true })
  lastMessage: string;

  @UpdateDateColumn()
  updatedAt: Date;
}