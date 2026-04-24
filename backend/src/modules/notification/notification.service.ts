// backend/src/modules/notification/notification.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // 1. BİLDİRİM OLUŞTUR (Diğer servisler bu metodu çağırır)
  // ═══════════════════════════════════════════════════════════
  async createNotification(params: {
    recipientId: string;
    senderId?: string;
    type: NotificationType;
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<Notification> {
    // Kendine bildirim göndermeyi engelle
    if (params.senderId && params.recipientId === params.senderId) {
      return null as any; // Sessizce atla
    }

    const notification = this.notificationRepository.create({
      recipientId: params.recipientId,
      senderId: params.senderId,
      type: params.type,
      title: params.title,
      message: params.message,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      isRead: false,
    });

    return this.notificationRepository.save(notification);
  }

  // ═══════════════════════════════════════════════════════════
  // 2. KULLANICININ BİLDİRİMLERİNİ LİSTELE (Sayfalı)
  // ═══════════════════════════════════════════════════════════
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ notifications: Notification[]; total: number; page: number }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { recipientId: userId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Hassas verileri temizle
    const sanitized = notifications.map((n) => ({
      ...n,
      sender: n.sender
        ? {
            id: n.sender.id,
            fullName: n.sender.fullName,
            profilePhoto: n.sender.profilePhoto,
          }
        : null,
    }));

    return { notifications: sanitized as any, total, page };
  }

  // ═══════════════════════════════════════════════════════════
  // 3. OKUNMAMIŞ BİLDİRİM SAYISINI DÖN
  // ═══════════════════════════════════════════════════════════
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepository.count({
      where: { recipientId: userId, isRead: false },
    });

    return { unreadCount };
  }

  // ═══════════════════════════════════════════════════════════
  // 4. TÜM BİLDİRİMLERİ "OKUNDU" OLARAK İŞARETLE
  // ═══════════════════════════════════════════════════════════
  async markAllAsRead(userId: string): Promise<{ marked: number }> {
    const result = await this.notificationRepository.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );

    return { marked: result.affected || 0 };
  }

  // ═══════════════════════════════════════════════════════════
  // 5. TEK BİLDİRİMİ "OKUNDU" OLARAK İŞARETLE
  // ═══════════════════════════════════════════════════════════
  async markOneAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, recipientId: userId },
      { isRead: true },
    );
  }
}