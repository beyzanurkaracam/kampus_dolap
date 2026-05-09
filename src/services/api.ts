import { Platform } from "react-native";
// 🛡️ GÜVENLİK GÜNCELLEMESİ: AsyncStorage yerine EncryptedStorage import edildi
import EncryptedStorage from 'react-native-encrypted-storage';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// ==========================================================
// TİP TANIMLAMALARI (SINGLE SOURCE OF TRUTH)
// ==========================================================
interface LoginData {
  email: string;
  password: string;
}
export interface DetectUniversityResponse {
  success: boolean;
  university?: {
    id?: string;
    name: string;
    domain?: string;
  };
  departments?: string[];
  message?: string;
}
interface RegisterData extends LoginData {
  fullName: string;
  department?: string; 
  phone?: string;      
  role?: 'admin' | 'user';
}

export interface User {
  id: string;
  email: string;
  fullName: string; 
  role: 'admin' | 'user' | 'ADMIN' | 'USER'; 
  isPremium?: boolean; 
  university?: { id?: string; name: string; domain?: string } | string; 
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

interface ErrorResponse {
  message?: string;
}

interface UploadResponse {
  avatarUrl?: string;
  url?: string;
  imageUrl?: string;
  data?: { url?: string };
}

type FavoritesBackendResponse = any[] | { favorites?: any[] };


class ApiService {
  private async getAuthHeaders() {
    // 🛡️ Şifreli hafızadan okuma
    const token = await EncryptedStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      // 🚀 SENIOR DOKUNUŞU: React Native'in agresif önbelleğini (cache) kapatıyoruz
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Giriş başarısız oldu');
    }

    const result = (await response.json()) as AuthResponse;
    // 🛡️ Şifreli hafızaya yazma
    await EncryptedStorage.setItem('token', result.access_token);
    await EncryptedStorage.setItem('user', JSON.stringify(result.user));
    return result;
  }

  async register(data: RegisterData): Promise<any> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Kayıt işlemi başarısız oldu');
    }

    // 👑 DÜZELTME BURADA: "as any" diyerek TypeScript'in kızmasını engelliyoruz
    const result = (await response.json()) as any;
    
    if (result.access_token && result.user) {
      await EncryptedStorage.setItem('token', result.access_token);
      await EncryptedStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  }

  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Kod doğrulanamadı');
    }

    const result = (await response.json()) as AuthResponse;
    // 🛡️ Şifreli hafızaya kayıt (Kritik)
    await EncryptedStorage.setItem('token', result.access_token);
    await EncryptedStorage.setItem('user', JSON.stringify(result.user));
    await EncryptedStorage.setItem('userType', 'user');
    return result;
  }

  async resendVerificationCode(email: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Kod gönderilemedi');
    }
  }

  async getProfile(): Promise<User> {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Profil bilgileri alınamadı');
    }

    const data = await response.json();
    return data as User;
  }

  async logout() {
    // 🛡️ Şifreli hafızadan silme
    await EncryptedStorage.removeItem('token');
    await EncryptedStorage.removeItem('user');
    await EncryptedStorage.removeItem('userType');
    // Alternatif olarak tüm depolamayı silmek istersen: await EncryptedStorage.clear();
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}/users`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Kullanıcılar getirilemedi');
    }

    const data = await response.json();
    return data as User[];
  }

  async createUser(data: RegisterData): Promise<User> {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Kullanıcı oluşturulamadı');
    }

    const result = await response.json();
    return result as User;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Kullanıcı güncellenemedi');
    }

    const result = await response.json();
    return result as User;
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Kullanıcı silinemedi');
    }
  }

  async followUser(targetUserId: string): Promise<{ message: string; isFollowing: boolean }> {
    const response = await fetch(`${API_URL}/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Takip etme işlemi başarısız');
    }

    const data = await response.json();
    return data as { message: string; isFollowing: boolean };
  }

  async unfollowUser(targetUserId: string): Promise<{ message: string; isFollowing: boolean }> {
    const response = await fetch(`${API_URL}/users/${targetUserId}/unfollow`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Takipten çıkma işlemi başarısız');
    }

    const data = await response.json();
    return data as { message: string; isFollowing: boolean };
  }

  async getFollowers(userId: string): Promise<User[]> {
    const response = await fetch(`${API_URL}/users/${userId}/followers`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Takipçiler getirilemedi');
    }

    const data = await response.json();
    return data as User[];
  }

  async getFollowing(userId: string): Promise<User[]> {
    const response = await fetch(`${API_URL}/users/${userId}/following`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Takip edilenler getirilemedi');
    }

    const data = await response.json();
    return data as User[];
  }

  async getUserProducts(userId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/products?sellerId=${userId}`, {
       headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error('Ürünler alınamadı');
    }
    const data = await response.json();
    return data as any[];
  }

  async getMyProducts(): Promise<any[]> {
    const response = await fetch(`${API_URL}/products/my-products`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Ürünler alınamadı');
    }
    const data = await response.json();
    return data as any[];
  }

  // ==========================================================
  // PROFİL VE AVATAR YÖNETİMİ
  // ==========================================================

  async uploadAvatar(formData: FormData): Promise<string> {
    // 🛡️ Şifreli hafızadan okuma
    const token = await EncryptedStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData as unknown as RequestInit['body'],
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Avatar yüklenemedi');
    }

    const result = (await response.json()) as UploadResponse;
    const avatarUrl = result.avatarUrl || result.url || result.imageUrl || result.data?.url;
    
    if (!avatarUrl) {
      throw new Error('Backend avatar URL döndürmedi');
    }
    
    return avatarUrl;
  }

  async updateProfile(profilePhotoUrl: string): Promise<User> {
    const response = await fetch(`${API_URL}/auth/profile/update`, {
      method: 'POST', 
      headers: await this.getAuthHeaders(), 
      body: JSON.stringify({ profilePhoto: profilePhotoUrl }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Profil güncellenemedi');
    }

    const data = await response.json();
    return data as User;
  }

  async checkIsFollowing(targetUserId: string): Promise<{ isFollowing: boolean }> {
    const response = await fetch(`${API_URL}/users/${targetUserId}/is-following`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      return { isFollowing: false };
    }

    const data = await response.json();
    return data as { isFollowing: boolean };
  }

  async getFollowStats(userId: string): Promise<{ followers: number; following: number }> {
    const response = await fetch(`${API_URL}/users/${userId}/follow-stats`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      return { followers: 0, following: 0 };
    }

    const data = await response.json();
    return data as { followers: number; following: number };
  }

  async getPublicUserProfile(userId: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_URL}/products?sellerId=${userId}`, {
        headers: await this.getAuthHeaders(),
      });
      
      if (!response.ok) return null;
      
      const products = (await response.json()) as any[];
      if (products && products.length > 0) {
        return products[0].seller as User; 
      }
      return null;
    } catch (error) {
      console.error('Public profil çekilemedi:', error);
      return null;
    }
  }

  async detectUniversity(email: string): Promise<DetectUniversityResponse> {
    const response = await fetch(`${API_URL}/auth/detect-university?email=${email}`);
    
    if (!response.ok) {
      // 👑 SENIOR DOKUNUŞU: 'as ErrorResponse' ekleyerek TypeScript'i rahatlatıyoruz
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Üniversite tespit edilemedi');
    }
    
    const data = await response.json();
    return data as DetectUniversityResponse;
  }
  async saveFcmToken(token: string) {
    const response = await fetch(`${API_URL}/auth/fcm-token`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('FCM Token kaydedilemedi');
    }
    return response.json();
  }

  // ==========================================================
  // FAVORİ YÖNETİMİ
  // ==========================================================

  async getFavorites(): Promise<any[]> {
    const response = await fetch(`${API_URL}/products/favorites`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      if (response.status === 404) return [];
      throw new Error(errorData.message || 'Favoriler yüklenemedi');
    }

    const data = (await response.json()) as FavoritesBackendResponse;
    return Array.isArray(data) ? data : (data.favorites || []);
  }

  async removeFavorite(productId: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/favorites/${productId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Favori kaldırılamadı');
    }
  }
  // ==========================================================
  // ANA SAYFA (HOME) İŞLEMLERİ
  // ==========================================================

  async getCategories(): Promise<any> {
    const response = await fetch(`${API_URL}/products/categories`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Kategoriler yüklenemedi');
    }

    return response.json();
  }

  async getListings(params: any): Promise<any[]> {
    const query = new URLSearchParams(params).toString();
    
    const response = await fetch(`${API_URL}/products?${query}`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'İlanlar yüklenemedi');
    }

    // 👑 SENIOR DOKUNUŞU: 'as any[]' diyerek TypeScript'i ikna ediyoruz
    const data = await response.json();
    return data as any[]; 
  }

  async addFavorite(productId: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/favorites/${productId}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Favori eklenemedi');
    }
  }
  // ==========================================================
  // ADMİN İŞLEMLERİ (Klasik Fetch Yapısı)
  // ==========================================================

  async getAdminDashboardStats(): Promise<any> {
    const response = await fetch(`${API_URL}/admin/dashboard`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Dashboard verileri alınamadı');
    }

    return response.json();
  }

  async getPendingProducts(): Promise<any[]> {
    const response = await fetch(`${API_URL}/admin/pending-products`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Bekleyen ürünler alınamadı');
    }

    const data = await response.json();
    return data as any[];
  }

  async approveProduct(productId: string): Promise<void> {
    const response = await fetch(`${API_URL}/admin/approve-product/${productId}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Ürün onaylanamadı');
    }
  }

  async rejectProduct(productId: string): Promise<void> {
    const response = await fetch(`${API_URL}/admin/reject-product/${productId}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Ürün reddedilemedi');
    }
  }
  
  async getChatMessages(chatId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Mesajlar alınamadı');
    }

    const data = await response.json();
    return data as any[];
  }
  // ==========================================================
  // SOHBET (CHAT) İŞLEMLERİ
  // ==========================================================

  async getChats(): Promise<any[]> {
    const response = await fetch(`${API_URL}/chats`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Sohbetler yüklenemedi');
    }

    const data = await response.json();
    return data as any[];
  }
  // ==========================================================
  // TEKLİF (OFFER) İŞLEMLERİ
  // ==========================================================

  async getReceivedOffers(): Promise<any[]> {
    const response = await fetch(`${API_URL}/offers/received`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Teklifler alınamadı');
    }

    // 👑 SENIOR DOKUNUŞU: Önce veriyi bekle, sonra "Bu bir dizidir" diyerek zorla (Type Casting)
    const data = await response.json();
    return data as any[];
  }

  async acceptOffer(id: string): Promise<{ offer: any; chatId: string }> {
    const response = await fetch(`${API_URL}/offers/${id}/accept`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Teklif kabul edilemedi');
    }

    return (await response.json()) as { offer: any; chatId: string };
  }

  async rejectOffer(id: string): Promise<any> {
    const response = await fetch(`${API_URL}/offers/${id}/reject`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Teklif reddedilemedi');
    }

    return response.json();
  }

  async counterOffer(id: string, amount: number): Promise<any> {
    const response = await fetch(`${API_URL}/offers/${id}/counter`, {
      method: 'POST',
      headers: {
        ...(await this.getAuthHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Karşı teklif gönderilemedi');
    }

    return response.json();
  }
  async createOffer(data: { productId: string; amount: number }): Promise<any> {
    const response = await fetch(`${API_URL}/offers`, {
      method: 'POST',
      headers: {
        ...(await this.getAuthHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Teklif gönderilemedi');
    }

    return response.json();
  }
 
  async getSentOffers(): Promise<any[]> {
    const response = await fetch(`${API_URL}/offers/made`, { 
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(errorData.message || 'Gönderilen teklifler alınamadı');
    }

    const data = await response.json();
    return data as any[];
  }
  // --- ÜRÜN VE KATEGORİ İŞLEMLERİ ---

 

  async getColors(): Promise<any> {
    const response = await fetch(`${API_URL}/products/colors`, { headers: await this.getAuthHeaders() });
    if (!response.ok) throw new Error('Renkler alınamadı');
    return response.json();
  }

  async getBrands(categoryId: string): Promise<any> {
    const response = await fetch(`${API_URL}/products/brands/${categoryId}`, { headers: await this.getAuthHeaders() });
    if (!response.ok) throw new Error('Markalar alınamadı');
    return response.json();
  }

  async uploadImage(formData: FormData): Promise<any> {
    // 🛡️ getAuthHeaders() KULLANMA — içinde Content-Type: application/json var
    // FormData için sadece Authorization header'ı lazım
    const token = await EncryptedStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/upload/image`, {
      method: 'POST',
      headers: {
        // Content-Type YOK — fetch otomatik multipart/form-data boundary ekleyecek
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData as any,
    });
    
   if (!response.ok) {
  const errorData = (await response.json().catch(() => ({}))) as { message?: string };
  throw new Error(errorData.message || 'Resim yüklenemedi');
}
    return response.json();
  }

  async createProduct(data: any): Promise<any> {
    const response = await fetch(`${API_URL}/products/create`, {
      method: 'POST',
      headers: {
        ...(await this.getAuthHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // 👑 TYPE FIX: errorData'nın içinde 'message' olabileceğini TypeScript'e söylüyoruz
      const errorData = (await response.json().catch(() => ({}))) as { message?: string };
      
      const error = new Error(errorData.message || 'Ürün eklenemedi');
      (error as any).status = response.status; // 403 kontrolü için status'ü ekliyoruz
      throw error;
    }
    return response.json();
  }
  async getProductComments(productId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/comments/product/${productId}/auth`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message || 'Yorumlar yüklenemedi');
    }
    return (await response.json()) as any[];
  }
 
  /** Yeni ana yorum oluştur */
  async createComment(productId: string, content: string): Promise<any> {
    const response = await fetch(`${API_URL}/comments`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ productId, content }),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message || 'Yorum gönderilemedi');
    }
    return response.json();
  }
 
  /** Yoruma yanıt ver */
  async replyToComment(parentId: string, content: string): Promise<any> {
    const response = await fetch(`${API_URL}/comments/reply`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ parentId, content }),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message || 'Yanıt gönderilemedi');
    }
    return response.json();
  }
 
  /** Yorum sil */
  async deleteComment(commentId: string): Promise<any> {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message || 'Yorum silinemedi');
    }
    return response.json();
  }

  async getNotifications(page: number, limit: number): Promise<{ notifications: any[]; total: number; page: number }> {
    const response = await fetch(`${API_URL}/notifications?page=${page}&limit=${limit}`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      throw new Error(errorData.message || 'Bildirimler yüklenemedi');
    }

    const data = await response.json();
    
    return data as { notifications: any[]; total: number; page: number };
  }
 
  async getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
    const response = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      throw new Error(errorData.message || 'Okunmamış bildirim sayısı alınamadı');
    }

    const data = await response.json();
    return data as { unreadCount: number };
  }
 
  async markAllNotificationsAsRead(): Promise<{ marked: number }> {
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      throw new Error(errorData.message || 'Bildirimler okundu işaretlenemedi');
    }

    const data = await response.json();
    return data as { marked: number };
  }
 
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const response = await fetch(
      `${API_URL}/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: await this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error('Bildirim okundu yapılamadı');
    }
  }

  // ==========================================================
  // ÜRÜN: REZERVE / SATILDI
  // ==========================================================

  async reserveProduct(productId: string): Promise<any> {
    const response = await fetch(`${API_URL}/products/${productId}/reserve`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'Ürün rezerve edilemedi');
    }
    return response.json();
  }

  async unreserveProduct(productId: string): Promise<any> {
    const response = await fetch(`${API_URL}/products/${productId}/unreserve`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'İşlem başarısız');
    }
    return response.json();
  }

  async markProductSold(
    productId: string,
  ): Promise<{ product: any; buyerId: string | null; offerId: string | null }> {
    const response = await fetch(`${API_URL}/products/${productId}/sold`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'Satış işaretlenemedi');
    }
    return (await response.json()) as { product: any; buyerId: string | null; offerId: string | null };
  }

  // ==========================================================
  // ENGELLEME
  // ==========================================================

  async blockUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/blocks/${userId}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'Engelleme başarısız');
    }
    return (await response.json()) as { message: string };
  }

  async unblockUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/blocks/${userId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'İşlem başarısız');
    }
    return (await response.json()) as { message: string };
  }

  async getBlockedUsers(): Promise<any[]> {
    const response = await fetch(`${API_URL}/blocks`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Engelliler yüklenemedi');
    return (await response.json()) as any[];
  }

  // ==========================================================
  // CHAT DETAİL (Yeni)
  // ==========================================================

  async getChatDetail(chatId: string): Promise<any> {
    const response = await fetch(`${API_URL}/chats/${chatId}`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'Sohbet bilgisi alınamadı');
    }
    return response.json();
  }

  // ==========================================================
  // DEĞERLENDİRME (REVIEW)
  // ==========================================================

  async createReview(data: { offerId: string; rating: number; comment?: string }): Promise<any> {
    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: {
        ...(await this.getAuthHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'Değerlendirme gönderilemedi');
    }
    return response.json();
  }

  async getSellerReviews(sellerId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/reviews/seller/${sellerId}`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Değerlendirmeler yüklenemedi');
    return (await response.json()) as any[];
  }

  async getReviewByOffer(offerId: string): Promise<any | null> {
    const response = await fetch(`${API_URL}/reviews/offer/${offerId}`, {
      headers: await this.getAuthHeaders(),
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(err.message || 'Değerlendirme alınamadı');
    }
    return response.json();
  }
}

export default new ApiService();