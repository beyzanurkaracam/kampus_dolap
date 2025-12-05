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
  Image,
  FlatList,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  status: string;
  images: Array<{ imageUrl: string; isPrimary: boolean }>;
  category: { name: string };
}

type TabType = 'products' | 'favorites';

export const ProfileScreen = ({ navigation }: any) => {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    console.log('ProfileScreen mount edildi');
    fetchProfile();
    fetchProducts();
    fetchFavorites(); // İlk yüklemede favorileri de çek
  }, []);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else {
      fetchFavorites();
    }
  }, [activeTab]);

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

  const fetchProducts = async () => {
    setDataLoading(true);
    try {
      if (!token) return;

      const response = await axios.get(`${API_URL}/products/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProducts(response.data);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
      Alert.alert('Hata', 'Ürünler yüklenemedi');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchFavorites = async () => {
    setDataLoading(true);
    try {
      if (!token) return;

      // TODO: Backend'de favoriler endpoint'i eklenecek
      const response = await axios.get(`${API_URL}/products/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFavorites(response.data);
    } catch (error) {
      console.error('Favoriler yüklenirken hata:', error);
      setFavorites([]); // Şimdilik boş array
    } finally {
      setDataLoading(false);
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

  const renderProductItem = ({ item }: { item: Product }) => {
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'active':
          return { text: 'Aktif', color: '#34c759', bgColor: '#e8f5e9' };
        case 'pending':
          return { text: 'Onay Bekliyor', color: '#ff9500', bgColor: '#fff3e0' };
        case 'sold':
          return { text: 'Satıldı', color: '#666', bgColor: '#f0f0f0' };
        case 'reserved':
          return { text: 'Rezerve', color: '#007AFF', bgColor: '#e3f2fd' };
        case 'removed':
          return { text: 'Reddedildi', color: '#ff3b30', bgColor: '#ffebee' };
        default:
          return { text: 'Bilinmiyor', color: '#999', bgColor: '#f5f5f5' };
      }
    };

    const statusInfo = getStatusInfo(item.status);

    return (
      <TouchableOpacity style={styles.productItem}>
        <Image
          source={{
            uri: item.images.find((img) => img.isPrimary)?.imageUrl || 
                 item.images[0]?.imageUrl || 
                 'https://via.placeholder.com/150',
          }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>{item.price} ₺</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.productStatus, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFavoriteItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productItem}>
      <Image
        source={{
          uri: item.images.find((img) => img.isPrimary)?.imageUrl || 
               item.images[0]?.imageUrl || 
               'https://via.placeholder.com/150',
        }}
        style={styles.productImage}
      />
      <TouchableOpacity 
        style={styles.favoriteButtonOnCard}
        onPress={async () => {
          try {
            await axios.delete(`${API_URL}/products/favorites/${item.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            // Favorilerden kaldır
            setFavorites(prev => prev.filter(p => p.id !== item.id));
          } catch (error) {
            Alert.alert('Hata', 'Favorilerden kaldırılamadı');
          }
        }}
      >
        <Text style={styles.heartIconOnCard}>❤️</Text>
      </TouchableOpacity>
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>{item.price} ₺</Text>
        <Text style={styles.productSeller}>
          {item.seller?.fullName || 'Bilinmeyen'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header - Profil Fotoğrafı ve İsim */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{
              uri: 'https://via.placeholder.com/100', // TODO: Backend'den profil fotoğrafı gelecek
            }}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.userName}>{profile?.fullName || 'Kullanıcı'}</Text>
        <Text style={styles.userEmail}>{profile?.email}</Text>
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'products' && styles.activeTabText,
            ]}>
            İlanlarım ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => setActiveTab('favorites')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'favorites' && styles.activeTabText,
            ]}>
            Favorilerim ({favorites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {dataLoading ? (
        <View style={styles.dataLoadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <>
          <FlatList
            data={activeTab === 'products' ? products : favorites}
            renderItem={activeTab === 'products' ? renderProductItem : renderFavoriteItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {activeTab === 'products'
                    ? 'Henüz ürün eklemediniz'
                    : 'Henüz favori ürün yok'}
                </Text>
              </View>
            }
          />
          
          {/* Floating Add Button - Sadece İlanlarım sekmesinde */}
          {activeTab === 'products' && (
            <TouchableOpacity
              style={styles.floatingAddButton}
              onPress={() => navigation.navigate('AddProduct')}>
              <Text style={styles.floatingAddButtonText}>+</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
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
  dataLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  productItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    maxWidth: '48%',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  favoriteButtonOnCard: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  heartIconOnCard: {
    fontSize: 20,
  },
  productInfo: {
    padding: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  productSeller: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  productStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  floatingAddButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
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
