// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { User as ApiUser } from '../services/api'; 

export interface User extends ApiUser {
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

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // 👑 SENIOR DOKUNUŞU: İlk açılışta beyaz (veya loading) ekran göstermek için default true.
  const [loading, setLoading] = useState(true); 

  const checkAuth = useCallback(async () => {
    // 👑 KRİTİK: İlk açılışta loading TRUE tutmalı ki UI render olmasın
    setLoading(true);
    try {
      console.log('🔄 checkAuth - başladı');
      const savedToken = await AsyncStorage.getItem('token');
      
      if (!savedToken) {
        console.log('⚠️ Token yok, Login ekranı gösterilecek');
        setToken(null);
        setUser(null);
        setLoading(false); // Token yoksa hemen ekranı aç
        return; // Token yoksa API'ye gitme
      }

      console.log('🎫 Token bulundu, profil çekiliyor...');
      
      // Token varsa profil bilgisini çek (İşlemler sırasında loading hala TRUE)
      const profileData = await api.getProfile();
      
      if (!profileData) {
        throw new Error('Profile data boş döndü');
      }
      
      // 👑 SENIOR DOKUNUŞU: Hem token'ı hem user'ı AYNI ANDA set ediyoruz.
      // Ayrı ayrı yaparsak React iki kere render eder ve yönlendirme bug'a girer.
      setToken(savedToken);
      setUser({ 
         ...profileData, 
         role: (profileData.role?.toUpperCase() || 'USER') as 'USER' | 'ADMIN' 
      });
      console.log('✅ checkAuth - Profil başarıyla yüklendi, authenticated');

    } catch (error: any) {
      console.log('❌ checkAuth HATA:', error.message);
      // Profil çekilemediyse token geçersiz/süresi dolmuş. Temizle!
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userType');
      setToken(null);
      setUser(null);
    } finally {
      // 👑 KRİTİK NOKTA: İşlemler TAMAMEN bitince loading'i FALSE'a çek
      console.log('✋ checkAuth bitti, UI kilidini aç (loading = false)');
      setLoading(false);
    }
  }, []);

  // Uygulama açıldığında BİR KERE çalışır.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async (email: string, password: string, userType: 'user' | 'admin') => {
      try {
        console.log('🔐 AuthContext.login başlatıldı');
        
        const response = await api.login({ email, password }, userType);
        
        // 👑 KRİTİK: Backend'den gelen cevap geçerli mi kontrol et
        if (!response || !response.access_token || !response.user) {
          throw new Error('Sunucudan geçersiz yanıt alındı (token veya user eksik)');
        }
        
        const userData: User = {
          ...response.user,
          role: (response.user.role?.toUpperCase() || userType.toUpperCase()) as 'USER' | 'ADMIN'
        };

        console.log('📝 Hazırlanan userData:', { id: userData.id, role: userData.role });

        // 👑 SENIOR DOKUNUŞU: Verileri donanıma yazılmasını (await) BEKLE
        await AsyncStorage.setItem('token', response.access_token);
        await AsyncStorage.setItem('userType', userType);
        
        console.log('💾 AsyncStorage\'a kaydedildi, state güncelleniyor...');
        
        // Donanıma yazıldıktan sonra state'i güncelle (Sıralama kritik)
        setToken(response.access_token);
        setUser(userData);
        
        console.log('✅ AuthContext.login başarılı, dönüştürülüyor...');
      } catch (error: any) {
        console.log('❌ AuthContext.login hata:', error.message);
        // Hata durumunda state'i temizle
        setToken(null);
        setUser(null);
        throw error; 
      }
    },
    [],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const response = await api.register({ email, password, fullName });
        
        const userData: User = {
          ...response.user,
          role: 'USER'
        };
        
        await AsyncStorage.setItem('token', response.access_token);
        await AsyncStorage.setItem('userType', 'user');
        
        setToken(response.access_token);
        setUser(userData);
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch (e) {
      console.log("Logout API hatası (önemsiz):", e);
    } finally {
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    userId: user?.id || null,
    loading,
    // 👑 Token varsa giriş yapılmış (user loading ekranında background'da yüklenebilir)
    isLoggedIn: !!token, 
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};