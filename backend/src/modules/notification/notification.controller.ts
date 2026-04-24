// backend/src/modules/notification/notification.controller.ts
import {
    Controller,
    Get,
    Patch,
    Param,
    Query,
    UseGuards,
    Request,
  } from '@nestjs/common';
  import { NotificationService } from './notification.service';
  import { JwtGuard } from '../guards/jwt.guard';
  
  @Controller('notifications')
  @UseGuards(JwtGuard)
  export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}
  
    // ── 1. Bildirim Listesi (Sayfalı) ──
    // GET /notifications?page=1&limit=20
    @Get()
    async getMyNotifications(
      @Request() req,
      @Query('page') page?: string,
      @Query('limit') limit?: string,
    ) {
      return this.notificationService.getUserNotifications(
        req.user.userId,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 20,
      );
    }
  
    // ── 2. Okunmamış Bildirim Sayısı ──
    // GET /notifications/unread-count
    @Get('unread-count')
    async getUnreadCount(@Request() req) {
      return this.notificationService.getUnreadCount(req.user.userId);
    }
  
    // ── 3. Tüm Bildirimleri Okundu İşaretle ──
    // PATCH /notifications/read-all
    @Patch('read-all')
    async markAllAsRead(@Request() req) {
      return this.notificationService.markAllAsRead(req.user.userId);
    }
  
    // ── 4. Tek Bildirimi Okundu İşaretle (Bonus) ──
    // PATCH /notifications/:id/read
    @Patch(':id/read')
    async markOneAsRead(@Request() req, @Param('id') id: string) {
      await this.notificationService.markOneAsRead(req.user.userId, id);
      return { success: true };
    }
  }