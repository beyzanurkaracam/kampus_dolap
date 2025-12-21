import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api'; // API servisinin olduğu yer
import { Platform } from 'react-native';
const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

const API_URL = `${BASE_URL}/auth`;

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: 'USER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  userId: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string, userType: 'user' | 'admin') => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  userId: null,
  loading: true,
  isLoggedIn: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Uygulama açıldığında token kontrol et
  const checkAuth = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        // Token doğrulaması yap
        const response = await axios.get(`${API_URL}/verify`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (response.data.valid) {
          setUser({ ...response.data.user, role: response.data.user.role.toUpperCase() as 'USER' | 'ADMIN' });
        }
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async (email: string, password: string, userType: 'user' | 'admin') => {
      const endpoint = userType === 'admin' ? 'admin-login' : 'login';
      const response = await axios.post(`${API_URL}/${endpoint}`, {
        email,
        password,
      });

      const newToken = response.data.access_token;
      const userData = response.data.user || response.data.admin;

      setToken(newToken);
      setUser({ ...userData, role: userData.role.toUpperCase() as 'USER' | 'ADMIN' });

      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('userType', userType);
    },
    [],
  );

// AuthContext.tsx dosyanın içi

const refreshProfile = useCallback(async () => {
  try {
    console.log("Profil yenileniyor...");
    
    // 1. Senin ApiService sınıfındaki getProfile fonksiyonunu çağırıyoruz
    // (api.ts içinde zaten /auth/profile'a istek atıyor)
    const updatedUserData = await api.getProfile();
    
    // 2. React State'ini güncelle (Anlık görünüm için)
    setUser({ ...updatedUserData, role: updatedUserData.role.toUpperCase() as 'USER' | 'ADMIN' }); 
    
    // 3. EKSİK OLAN PARÇA: AsyncStorage'ı güncelle (Kalıcılık için)
    // Bunu yapmazsan uygulama yeniden başlatıldığında eski profil yüklenir!
    await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
    
    console.log("Profil başarıyla yenilendi ve kaydedildi:", updatedUserData);
    return updatedUserData;
  } catch (error) {
    console.error("Profil güncellenemedi:", error);
    // İsteğe bağlı: Kullanıcıya hata mesajı (Toast) gösterebilirsin
    throw error; 
  }
}, []);
  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const response = await axios.post(`${API_URL}/register`, {
        email,
        password,
        fullName,
      });

      const newToken = response.data.access_token;
      const userData = response.data.user;

      setToken(newToken);
      setUser(userData);

      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('userType', 'user');
    },
    [],
  );

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userType');
  }, []);

  const value: AuthContextType = {
    user,
    token,
    userId: user?.id || null,
    loading,
    isLoggedIn: !!token,
    login,
    register,
    logout,
    checkAuth,
  };

  console.log('AuthContext - token:', token ? 'Var (ilk 20: ' + token.substring(0, 20) + ')' : 'YOK', 'loading:', loading);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook: Auth context'i kolay kullanmak için
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};