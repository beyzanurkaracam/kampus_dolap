
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
}

export default new ApiService();