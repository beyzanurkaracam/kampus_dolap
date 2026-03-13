import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { CampusLocation } from './campus-location.entity';



@Entity('universities')
export class University {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  emailDomain: string; // Örn: "@sakarya.edu.tr"

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  city: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.university)
  users: User[];

  @OneToMany(() => Product, (product) => product.university)
  products: Product[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => CampusLocation, (location) => location.university)
  campusLocations: CampusLocation[];

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude: number;
}
