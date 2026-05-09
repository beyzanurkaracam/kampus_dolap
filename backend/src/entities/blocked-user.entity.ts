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

@Entity('blocked_users')
@Unique(['blockerId', 'blockedId'])
@Index(['blockerId'])
@Index(['blockedId'])
export class BlockedUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  @Column()
  blockerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: User;

  @Column()
  blockedId: string;

  @CreateDateColumn()
  createdAt: Date;
}
