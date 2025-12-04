import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

export const API_URL = `${BASE_URL}`;
export const AUTH_URL = `${BASE_URL}/auth`;
export const UNIVERSITY_URL = `${BASE_URL}/university`;

interface UserProfile {
  fullName: string;
  email: string;
  department: string;
  university: {
    name: string;
  };
}

export const ProfileScreen = ({ navigation }: any) => {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('ProfileScreen mount edildi');
    fetchProfile();
    fetchProductCount();
  }, []);

  const fetchProfile = async () => {
    console.log('fetchProfile başladı');
    try {
      const profileData = await api.getProfile();
      console.log('Profile yanıtı alındı:', profileData);
      setProfile(profileData as any);
    } catch (error: any) {
      console.error('Profil yüklenirken hata:', error);
      
      if (error.message === 'Failed to fetch profile') {
        Alert.alert('Oturum Sonlandı', 'Lütfen tekrar giriş yapın', [
          { text: 'Tamam', onPress: () => {
            api.logout();
            navigation.replace('Login');
          }}
        ]);
      } else {
        Alert.alert('Hata', error.message || 'Profil bilgileri yüklenemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProductCount = async () => {
    try {
      if (!token) return;

      // URL artık dinamik olarak config dosyasından geliyor
      const response = await fetch(`${API_URL}/products/my-products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const products = await response.json();
        setProductCount(products.length);
      }
    } catch (error) {
      console.error('Ürün sayısı alınırken hata:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await api.logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hesabım</Text>
      </View>

      {profile && (
        <View style={styles.profileSection}>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Ad Soyad</Text>
            <Text style={styles.value}>{profile.fullName}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>E-posta</Text>
            <Text style={styles.value}>{profile.email}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>Üniversite</Text>
            <Text style={styles.value}>{profile.university.name}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>Bölüm</Text>
            <Text style={styles.value}>{profile.department}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ürünlerim</Text>
        
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => navigation.navigate('MyProducts')}>
          <View style={styles.productCardContent}>
            <Text style={styles.productCardTitle}>İlanlarım</Text>
            <Text style={styles.productCount}>{productCount} Ürün</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProduct')}>
          <Text style={styles.addButtonText}>+ Yeni Ürün Ekle</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  profileItem: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    marginTop: 10,
    backgroundColor: '#fff',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 15,
  },
  productCardContent: {
    flex: 1,
  },
  productCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  productCount: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 30,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  logoutButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
});
