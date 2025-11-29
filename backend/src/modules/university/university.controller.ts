import { Controller, Get, Param, Query } from '@nestjs/common';
import { UniversityService } from './university.service';

@Controller('university')
export class UniversityController {
  constructor(private universityService: UniversityService) {}

  @Get()
  async getAllUniversities() {
    return this.universityService.getAllUniversities();
  }

  @Get('search')
  async searchUniversities(@Query('q') searchTerm: string) {
    if (!searchTerm) {
      return [];
    }
    return this.universityService.searchUniversities(searchTerm);
  }

  @Get('departments/all')
  async getAllUniversityNames() {
    return this.universityService.getAllUniversityNamesWithDepartments();
  }

  @Get('departments/:universityName')
  async getDepartmentsByUniversity(@Param('universityName') universityName: string) {
    const departments = this.universityService.getDepartmentsByUniversityName(universityName);
    return {
      universityName,
      departments,
      count: departments.length
    };
  }

  @Get(':id')
  async getUniversityById(@Param('id') id: string) {
    return this.universityService.getUniversityById(id);
  }
}
