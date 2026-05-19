import EncryptedStorage from 'react-native-encrypted-storage';
import { httpClient } from './client';
import type { User, AuthResponse, DetectUniversityResponse } from './types';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData extends LoginData {
  fullName: string;
  department?: string;
  phone?: string;
  role?: 'admin' | 'user';
}

class AuthApi {
  private persistAuth = async (result: AuthResponse, userType?: string) => {
    await EncryptedStorage.setItem('token', result.access_token);
    await EncryptedStorage.setItem('user', JSON.stringify(result.user));
    if (userType) await EncryptedStorage.setItem('userType', userType);
  };

  login = async (data: LoginData): Promise<AuthResponse> => {
    const result = await httpClient.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      fallbackError: 'Giriş başarısız oldu',
    });
    await this.persistAuth(result);
    return result;
  };

  register = async (data: RegisterData): Promise<any> => {
    const result = await httpClient.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      fallbackError: 'Kayıt işlemi başarısız oldu',
    });
    if (result?.access_token && result?.user) await this.persistAuth(result);
    return result;
  };

  verifyEmail = async (email: string, code: string): Promise<AuthResponse> => {
    const result = await httpClient.request<AuthResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
      fallbackError: 'Kod doğrulanamadı',
    });
    await this.persistAuth(result, 'user');
    return result;
  };

  resendVerificationCode = (email: string): Promise<void> =>
    httpClient.request<void>('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
      fallbackError: 'Kod gönderilemedi',
    });

  getProfile = (): Promise<User> =>
    httpClient.request<User>('/auth/profile', { fallbackError: 'Profil bilgileri alınamadı' });

  updateProfile = (profilePhotoUrl: string): Promise<User> =>
    httpClient.request<User>('/auth/profile/update', {
      method: 'POST',
      body: JSON.stringify({ profilePhoto: profilePhotoUrl }),
      fallbackError: 'Profil güncellenemedi',
    });

  logout = async (): Promise<void> => {
    await EncryptedStorage.removeItem('token');
    await EncryptedStorage.removeItem('user');
    await EncryptedStorage.removeItem('userType');
  };

  detectUniversity = (email: string): Promise<DetectUniversityResponse> =>
    httpClient.request<DetectUniversityResponse>(
      `/auth/detect-university?email=${encodeURIComponent(email)}`,
      { fallbackError: 'Üniversite tespit edilemedi' },
    );

  saveFcmToken = (token: string): Promise<any> =>
    httpClient.request<any>('/auth/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
      fallbackError: 'FCM Token kaydedilemedi',
    });
}

export const authApi = new AuthApi();
