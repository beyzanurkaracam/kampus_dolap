// backend/src/entities/campus-location.entity.ts

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { University } from './university.entity';
  
  @Entity('campus_locations')
  export class CampusLocation {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    name: string;
  
    @Column()
    type: string; // cafe, fast_food, library, university, restaurant, etc.
  
    @Column('decimal', { precision: 10, scale: 7 })
    latitude: number;
  
    @Column('decimal', { precision: 10, scale: 7 })
    longitude: number;
  
    @ManyToOne(() => University, (university) => university.campusLocations, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'universityId' })
    university: University;
  
    @Column()
    universityId: string;
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @Column({ default: true })
    isActive: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }