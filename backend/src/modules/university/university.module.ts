import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { University } from 'src/entities/university.entity';
import { UniversityService } from './university.service';
import { UniversityController } from './university.controller';
import { CampusLocation } from 'src/entities/campus-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([University, CampusLocation])],
  controllers: [UniversityController],
  providers: [UniversityService],
  exports: [UniversityService],
})
export class UniversityModule {}
