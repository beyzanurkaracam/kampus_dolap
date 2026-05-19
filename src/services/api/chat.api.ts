import { httpClient } from './client';

class ChatApi {
  getChats = (): Promise<any[]> =>
    httpClient.request<any[]>('/chats', { fallbackError: 'Sohbetler yüklenemedi' });

  getChatMessages = (chatId: string): Promise<any[]> =>
    httpClient.request<any[]>(`/chats/${chatId}/messages`, { fallbackError: 'Mesajlar alınamadı' });

  getChatDetail = (chatId: string): Promise<any> =>
    httpClient.request<any>(`/chats/${chatId}`, { fallbackError: 'Sohbet bilgisi alınamadı' });
}

export const chatApi = new ChatApi();
