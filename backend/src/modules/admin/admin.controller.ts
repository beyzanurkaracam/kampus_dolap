import { Controller, Get, UseGuards, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { JwtGuard } from '../guards/jwt.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('pending-products')
  async getPendingProducts() {
    return this.adminService.getPendingProducts();
  }

  @Post('approve-product/:id')
  async approveProduct(@Param('id') id: string) {
    return this.adminService.approveProduct(id);
  }

  @Post('reject-product/:id')
  async rejectProduct(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.adminService.rejectProduct(id, body.reason);
  }

  // ─────────────── Kullanıcılar ───────────────

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  async updateUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.updateUserStatus(id, body.isActive);
  }

  @Patch('users/:id/premium')
  async updateUserPremium(@Param('id') id: string, @Body() body: { isPremium: boolean }) {
    return this.adminService.updateUserPremium(id, body.isPremium);
  }

  // ─────────────── Teklifler ───────────────

  @Get('offers')
  async getAllOffers() {
    return this.adminService.getAllOffers();
  }

  // ─────────────── Sohbetler ───────────────

  @Get('chats')
  async getAllChats() {
    return this.adminService.getAllChats();
  }

  // ─────────────── Kategoriler ───────────────

  @Post('categories')
  async createCategory(
    @Body() body: { name: string; description?: string; parentId?: number; order?: number; isActive?: boolean },
  ) {
    return this.adminService.createCategory(body);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body()
    body: Partial<{ name: string; description: string; isActive: boolean; parentId: number; order: number }>,
  ) {
    return this.adminService.updateCategory(Number(id), body);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(Number(id));
  }

  // ─────────────── Üniversiteler ───────────────

  @Patch('universities/:id')
  async updateUniversity(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; city: string; emailDomain: string; isActive: boolean }>,
  ) {
    return this.adminService.updateUniversity(id, body);
  }

  // ─────────────── Kampüs Konumları ───────────────

  @Post('campus-locations')
  async createCampusLocation(
    @Body()
    body: { name: string; type: string; latitude: number; longitude: number; universityId: string; description?: string },
  ) {
    return this.adminService.createCampusLocation(body);
  }

  @Delete('campus-locations/:id')
  async deleteCampusLocation(@Param('id') id: string) {
    return this.adminService.deleteCampusLocation(id);
  }
}
