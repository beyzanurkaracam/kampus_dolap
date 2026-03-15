// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
// 🛡️ 3. ÇÖZÜM: AsyncStorage yerine donanımsal şifreleme yapan kütüphaneyi kullanıyoruz
import EncryptedStorage from 'react-native-encrypted-storage';
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
  const [loading, setLoading] = useState(true); 

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔄 checkAuth - başladı');
      
      const savedToken = await EncryptedStorage.getItem('token');
      // 🚨 1. ÇÖZÜM İÇİN EK: İnternet yoksa bile user'ı yükleyebilmek için cache'den alıyoruz
      const savedUserStr = await EncryptedStorage.getItem('user_profile');
      
      if (!savedToken) {
        setToken(null);
        setUser(null);
        return; 
      }

      // Önce elimizdeki verilerle state'i dolduralım (Uygulamanın offline veya hızlı açılmasını sağlar)
      setToken(savedToken);
      if (savedUserStr) {
        setUser(JSON.parse(savedUserStr));
      }

      console.log('🎫 Token bulundu, arka planda en güncel profil çekiliyor...');
      
      const profileData = await api.getProfile();
      
      if (profileData) {
        const updatedUser: User = { 
          ...profileData, 
          role: (profileData.role?.toUpperCase() || 'USER') as 'USER' | 'ADMIN' 
        };
        setUser(updatedUser);
        // Profil başarıyla çekildiyse cache'i de güncelliyoruz
        await EncryptedStorage.setItem('user_profile', JSON.stringify(updatedUser));
      }

    } catch (error: any) {
      console.log('❌ checkAuth HATA:', error.message);
      
      // 🚨 1. ÇÖZÜM (Uçak Modu Koruması): Sadece hata 401 (Yetkisiz/Token patlak) ise çıkış yap!
      // İnternet çekmiyorsa (Network Error) if bloğuna girmeyecek, üstteki cache verileriyle kullanıcı içeride kalacak.
      const isUnauthorized = error?.response?.status === 401 || error?.message?.includes('401') || error?.message?.includes('token');
      
      if (isUnauthorized) {
        console.log('⚠️ Token geçersiz, oturum kapatılıyor...');
        await EncryptedStorage.removeItem('token');
        await EncryptedStorage.removeItem('userType');
        await EncryptedStorage.removeItem('user_profile');
        setToken(null);
        setUser(null);
      } else {
        console.log('📶 Ağ hatası tespit edildi, mevcut oturum korunuyor (Offline Mod)');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async (email: string, password: string, userType: 'user' | 'admin') => {
      try {
        const response = await api.login({ email, password }, userType);
        
        if (!response || !response.access_token || !response.user) {
          throw new Error('Sunucudan geçersiz yanıt alındı');
        }
        
        const userData: User = {
          ...response.user,
          role: (response.user.role?.toUpperCase() || userType.toUpperCase()) as 'USER' | 'ADMIN'
        };

        // Donanımsal Şifreli Veritabanına Yazma
        await EncryptedStorage.setItem('token', response.access_token);
        await EncryptedStorage.setItem('userType', userType);
        await EncryptedStorage.setItem('user_profile', JSON.stringify(userData));
        
        setToken(response.access_token);
        setUser(userData);
        
      } catch (error: any) {
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
        
        const userData: User = { ...response.user, role: 'USER' };
        
        await EncryptedStorage.setItem('token', response.access_token);
        await EncryptedStorage.setItem('userType', 'user');
        await EncryptedStorage.setItem('user_profile', JSON.stringify(userData));
        
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
      await api.logout(); // Backend'e çıkış isteği at
    } catch (e) {
      console.log("Logout API hatası (önemsiz):", e);
    } finally {
      await EncryptedStorage.clear(); // Tüm şifreli verileri tertemiz yap
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  }, []);

  // ⚡ 2. ÇÖZÜM: Performans Sızıntısını Önlemek için useMemo Kullanımı
  // 💥 4. ÇÖZÜM: Çökme riskine karşı isLoggedIn: !!token && !!user
  const value = useMemo<AuthContextType>(() => ({
    user,
    token,
    userId: user?.id || null,
    loading,
    isLoggedIn: !!token && !!user, 
    login,
    register,
    logout,
    checkAuth,
  }), [user, token, loading, login, register, logout, checkAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};