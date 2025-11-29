import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  StatusBar, // StatusBar eklendi
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Platforma göre URL belirleme
const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

const API_URL = `${BASE_URL}/products`;

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

export const MyProductsScreen = ({ navigation }: any) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hook kullanımı
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await axios.get(`${API_URL}/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProducts(response.data);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
      Alert.alert('Hata', 'Ürünler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Ürünü Sil',
      'Bu ürünü silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.delete(`${API_URL}/${productId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              
              Alert.alert('Başarılı', 'Ürün silindi');
              fetchProducts();
            } catch (error) {
              Alert.alert('Hata', 'Ürün silinemedi');
            }
          },
        },
      ]
    );
  };

  const getConditionText = (condition: string) => {
    const conditions: { [key: string]: string } = {
      new: 'Sıfır',
      like_new: 'Sıfır Gibi',
      good: 'İyi',
      fair: 'Orta',
      poor: 'Eski',
    };
    return conditions[condition] || condition;
  };

  const getStatusText = (status: string) => {
    const statuses: { [key: string]: string } = {
      active: 'Aktif',
      sold: 'Satıldı',
      inactive: 'Pasif',
    };
    return statuses[status] || status;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const primaryImage = item.images?.find(img => img.isPrimary) || item.images?.[0];

    return (
      <View style={styles.productCard}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.noImage]}>
            <Text style={styles.noImageText}>Resim Yok</Text>
          </View>
        )}
        
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productCategory}>{item.category?.name}</Text>
          <Text style={styles.productPrice}>₺{item.price ? item.price.toFixed(2) : '0.00'}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productCondition}>{getConditionText(item.condition)}</Text>
            <Text style={[
              styles.productStatus,
              item.status === 'sold' && styles.statusSold
            ]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(item.id)}>
            <Text style={styles.deleteButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* DEĞİŞİKLİK BURADA: 
        Header'a dinamik padding veriyoruz.
        insets.top: Çentik yüksekliği kadar boşluk bırakır.
        Ekstra 10px: Status bar ile içerik arasına hafif boşluk verir.
      */}
      <View style={[
        styles.header, 
        { 
          paddingTop: Math.max(insets.top, 20), // Çentik yoksa en az 20px
          height: 60 + Math.max(insets.top, 20) // Toplam yüksekliği buna göre ayarla
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.backButton}>‹ Geri</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Ürünlerim</Text>
        
        <TouchableOpacity onPress={() => navigation.navigate('AddProduct')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.addButton}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz ürün eklemediniz</Text>
          <TouchableOpacity
            style={styles.addProductButton}
            onPress={() => navigation.navigate('AddProduct')}>
            <Text style={styles.addProductButtonText}>İlk Ürünü Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Dikeyde ortalar
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    // height: 60, <--- BU SATIRI KALDIRDIK (Dinamik veriyoruz)
    // padding: 15, <--- BU SATIRI GÜNCELLEDİK (Aşağıdaki gibi)
    paddingHorizontal: 15,
    paddingBottom: 10, // Alt kısımdan biraz boşluk
  },
  backButton: {
    fontSize: 18, // Font boyutunu biraz daha standart hale getirdim (30 çok büyüktü)
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 40, // Listenin en altı için ekstra boşluk
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    fontSize: 12,
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  productMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  productCondition: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  productStatus: {
    fontSize: 12,
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusSold: {
    color: '#999',
    backgroundColor: '#f0f0f0',
  },
  actions: {
    justifyContent: 'center',
    paddingLeft: 5,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  addProductButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  addProductButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});