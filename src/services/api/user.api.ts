import { httpClient } from './client';
import type { User } from './types';
import type { RegisterData } from './auth.api';

interface UploadResponse {
  avatarUrl?: string;
  url?: string;
  imageUrl?: string;
  data?: { url?: string };
}

class UserApi {
  // --- CRUD ---
  getAllUsers = (): Promise<User[]> =>
    httpClient.request<User[]>('/users', { fallbackError: 'Kullanıcılar getirilemedi' });

  createUser = (data: RegisterData): Promise<User> =>
    httpClient.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
      fallbackError: 'Kullanıcı oluşturulamadı',
    });

  updateUser = (id: string, data: Partial<User>): Promise<User> =>
    httpClient.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      fallbackError: 'Kullanıcı güncellenemedi',
    });

  deleteUser = (id: string): Promise<void> =>
    httpClient.request<void>(`/users/${id}`, {
      method: 'DELETE',
      fallbackError: 'Kullanıcı silinemedi',
    });

  // --- TAKİP ---
  followUser = (targetUserId: string): Promise<{ message: string; isFollowing: boolean }> =>
    httpClient.request(`/users/${targetUserId}/follow`, {
      method: 'POST',
      fallbackError: 'Takip etme işlemi başarısız',
    });

  unfollowUser = (targetUserId: string): Promise<{ message: string; isFollowing: boolean }> =>
    httpClient.request(`/users/${targetUserId}/unfollow`, {
      method: 'DELETE',
      fallbackError: 'Takipten çıkma işlemi başarısız',
    });

  getFollowers = (userId: string): Promise<User[]> =>
    httpClient.request<User[]>(`/users/${userId}/followers`, {
      fallbackError: 'Takipçiler getirilemedi',
    });

  getFollowing = (userId: string): Promise<User[]> =>
    httpClient.request<User[]>(`/users/${userId}/following`, {
      fallbackError: 'Takip edilenler getirilemedi',
    });

  checkIsFollowing = (targetUserId: string): Promise<{ isFollowing: boolean }> =>
    httpClient.safeRequest(`/users/${targetUserId}/is-following`, { isFollowing: false });

  getFollowStats = (userId: string): Promise<{ followers: number; following: number }> =>
    httpClient.safeRequest(`/users/${userId}/follow-stats`, { followers: 0, following: 0 });

  // --- UPLOAD ---
  uploadAvatar = async (formData: FormData): Promise<string> => {
    const result = await httpClient.request<UploadResponse>('/upload/avatar', {
      method: 'POST',
      body: formData,
      fallbackError: 'Avatar yüklenemedi',
    });
    const avatarUrl = result.avatarUrl || result.url || result.imageUrl || result.data?.url;
    if (!avatarUrl) throw new Error('Backend avatar URL döndürmedi');
    return avatarUrl;
  };

  uploadImage = (formData: FormData): Promise<any> =>
    httpClient.request<any>('/upload/image', {
      method: 'POST',
      body: formData,
      fallbackError: 'Resim yüklenemedi',
    });

  // --- PUBLIC PROFİL ---
  getPublicUserProfile = async (userId: string): Promise<User | null> => {
    const products = await httpClient.safeRequest<any[]>(`/products?sellerId=${userId}`, []);
    return products[0]?.seller ?? null;
  };

  // --- ENGELLEME ---
  blockUser = (userId: string): Promise<{ message: string }> =>
    httpClient.request(`/blocks/${userId}`, {
      method: 'POST',
      fallbackError: 'Engelleme başarısız',
    });

  unblockUser = (userId: string): Promise<{ message: string }> =>
    httpClient.request(`/blocks/${userId}`, {
      method: 'DELETE',
      fallbackError: 'İşlem başarısız',
    });

  getBlockedUsers = (): Promise<any[]> =>
    httpClient.request<any[]>('/blocks', { fallbackError: 'Engelliler yüklenemedi' });
}

export const userApi = new UserApi();
