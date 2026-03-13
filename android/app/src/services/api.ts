
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";


const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
interface LoginData {
  email: string;
  password: string;
}

interface RegisterData extends LoginData {
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user';
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  isPremium?: boolean; 
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

class ApiService {
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('token');
    console.log('getAuthHeaders - Token alındı:', token ? `${token.substring(0, 20)}...` : 'YOK');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const result = await response.json();
    console.log('api.ts login - Token kaydediliyor:', result.access_token ? `${result.access_token.substring(0, 20)}...` : 'YOK');
    await AsyncStorage.setItem('token', result.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(result.user));
    console.log('api.ts login - Token kaydedildi');
    return result;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const result = await response.json();
    await AsyncStorage.setItem('token', result.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(result.user));
    return result;
  }

  async getProfile(): Promise<User> {
    console.log('api.ts getProfile - API çağrısı yapılıyor...');
    const headers = await this.getAuthHeaders();
    console.log('api.ts getProfile - Headers:', headers);
    
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: headers,
    });

    console.log('api.ts getProfile - Response status:', response.status);
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  }

  async logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('userType');
    console.log('api.ts logout - Token silindi');
  }

  // Admin CRUD operations
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}/users`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  }

  async createUser(data: RegisterData): Promise<User> {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    return response.json();
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    return response.json();
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  }

  async followUser(targetUserId: string): Promise<{ message: string; isFollowing: boolean }> {
    const response = await fetch(`${API_URL}/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Takip etme işlemi başarısız');
    }

    return response.json();
  }

  // Takipten çık
  async unfollowUser(targetUserId: string): Promise<{ message: string; isFollowing: boolean }> {
    const response = await fetch(`${API_URL}/users/${targetUserId}/unfollow`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Takipten çıkma işlemi başarısız');
    }

    return response.json();
  }

  // Bir kullanıcının takipçilerini getir (Beni takip edenler)
  async getFollowers(userId: string): Promise<User[]> {
    const response = await fetch(`${API_URL}/users/${userId}/followers`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Takipçiler getirilemedi');
    }

    return response.json();
  }

  // Bir kullanıcının takip ettiklerini getir (Benim takip ettiklerim)
  async getFollowing(userId: string): Promise<User[]> {
    const response = await fetch(`${API_URL}/users/${userId}/following`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Takip edilenler getirilemedi');
    }

    return response.json();
  }

  // Ben bu kişiyi takip ediyor muyum? (Buton rengi için)
  async checkIsFollowing(targetUserId: string): Promise<{ isFollowing: boolean }> {
    const response = await fetch(`${API_URL}/users/${targetUserId}/is-following`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      // Hata durumunda false dönmek güvenli olabilir veya hata fırlatabilirsin
      return { isFollowing: false };
    }

    return response.json();
  }

  // Takipçi ve Takip Edilen sayılarını getir (Profilde göstermek için)
  async getFollowStats(userId: string): Promise<{ followers: number; following: number }> {
    const response = await fetch(`${API_URL}/users/${userId}/follow-stats`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      // Hata olursa 0-0 dönelim ki ekran patlamasın
      return { followers: 0, following: 0 };
    }

    return response.json();
  }

  async getPublicUserProfile(userId: string): Promise<User | null> {
    try {
      // Backend'de direkt public user endpoint'i olmadığı için
      // şimdilik ürünleri çekip oradan kullanıcı bilgisini ayıklıyoruz.
      // İleride backend'e GET /users/:id eklersen burayı güncellersin.
      const response = await fetch(`${API_URL}/products?sellerId=${userId}`, {
        headers: await this.getAuthHeaders(),
      });
      
      if (!response.ok) return null;
      
      const products = await response.json();
      if (products && products.length > 0) {
        return products[0].seller; // İlk ürünün satıcısını döndür
      }
      return null;
    } catch (error) {
      console.error('Public profil çekilemedi:', error);
      return null;
    }
  }

  async getUserProducts(userId: string) {
    const response = await fetch(`${API_URL}/products?sellerId=${userId}`, {
       headers: await this.getAuthHeaders(),
    });
    return response.json();
  }

  async getUniversityLocations(universityId: string) {
    const response = await fetch(`${API_URL}/university/${universityId}/locations`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Konumlar alınamadı');
    return response.json();
  }

  // Teklifi kabul et ve buluşma ayarla
  async acceptOfferWithMeeting(offerId: string, meetingPointId: string, meetingTime: Date) {
    const response = await fetch(`${API_URL}/offers/${offerId}/accept`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({
        meetingPointId,
        meetingTime: meetingTime.toISOString(), // ISO formatında gönderiyoruz
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Teklif kabul edilemedi');
    }
    return response.json();
  }
  
  async confirmMeeting(offerId: string) {
    const response = await fetch(`${API_URL}/offers/${offerId}/confirm-meeting`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Onaylanamadı');
    }
    return response.json();
  }

}

export default new ApiService();