import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Listing } from '../types/listing.types';

const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

const UserHomeScreen = ({ navigation }: any) => {
  const { user, token, logout } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchListings();
    fetchFavorites();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      // Sadece aktif (admin onaylı) ürünleri getir
      const response = await axios.get(`${API_URL}/products`);
      console.log('Aktif ürünler yüklendi:', response.data.length);
      setListings(response.data);
    } catch (error) {
      console.log('Ürünler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      if (!token) return;
      const response = await axios.get(`${API_URL}/products/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ids = new Set(response.data.map((p: any) => p.id));
      setFavoriteIds(ids);
    } catch (error) {
      console.log('Favoriler yüklenemedi:', error);
    }
  };

  const toggleFavorite = async (productId: string) => {
    try {
      if (!token) {
        Alert.alert('Uyarı', 'Favori eklemek için giriş yapmalısınız');
        return;
      }

      const isFavorite = favoriteIds.has(productId);
      
      if (isFavorite) {
        await axios.delete(`${API_URL}/products/favorites/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        await axios.post(`${API_URL}/products/favorites/${productId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavoriteIds(prev => new Set(prev).add(productId));
      }
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.message || 'Favori işlemi başarısız');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    await fetchFavorites();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const renderListing = ({ item }: { item: Listing }) => {
    const isFavorite = favoriteIds.has(item.id);
    
    return (
      <TouchableOpacity style={styles.card}>
        <Image
          source={{
            uri: (item.images && item.images.length > 0) 
              ? item.images[0].imageUrl 
              : 'https://via.placeholder.com/150'
          }}
          style={styles.image}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(item.id)}
            >
              <Text style={[styles.heartIcon, isFavorite && styles.heartIconActive]}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.price}>₺{item.price.toLocaleString('tr-TR')}</Text>
          <Text style={styles.seller}>{item.seller?.fullName || 'Bilinmeyen'}</Text>
          <Text style={styles.category}>{item.category?.name || 'Diğer'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && listings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hoş geldin,</Text>
          <Text style={styles.userName}>{user?.fullName || user?.email}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileText}>Hesabım</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={listings}
        renderItem={renderListing}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz ürün yok</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 14,
    color: '#999',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  profileButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  profileText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 5,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 5,
    marginVertical: 5,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  cardContent: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  favoriteButton: {
    padding: 4,
  },
  heartIcon: {
    fontSize: 20,
  },
  heartIconActive: {
    transform: [{ scale: 1.1 }],
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  seller: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  category: {
    fontSize: 11,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});

export default UserHomeScreen;