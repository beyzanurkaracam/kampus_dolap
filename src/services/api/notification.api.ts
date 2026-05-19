import { httpClient } from './client';

class NotificationApi {
  getNotifications = (
    page: number,
    limit: number,
  ): Promise<{ notifications: any[]; total: number; page: number }> =>
    httpClient.request(`/notifications?page=${page}&limit=${limit}`, {
      fallbackError: 'Bildirimler yüklenemedi',
    });

  getUnreadNotificationCount = (): Promise<{ unreadCount: number }> =>
    httpClient.request('/notifications/unread-count', {
      fallbackError: 'Okunmamış bildirim sayısı alınamadı',
    });

  markAllNotificationsAsRead = (): Promise<{ marked: number }> =>
    httpClient.request('/notifications/read-all', {
      method: 'PATCH',
      fallbackError: 'Bildirimler okundu işaretlenemedi',
    });

  markNotificationAsRead = (notificationId: string): Promise<void> =>
    httpClient.request<void>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      fallbackError: 'Bildirim okundu yapılamadı',
    });
}

export const notificationApi = new NotificationApi();
