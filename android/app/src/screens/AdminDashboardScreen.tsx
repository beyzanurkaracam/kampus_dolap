// src/screens/AdminDashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { DashboardData } from '../types/dashboard.types';



const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

const AdminDashboardScreen = ({ navigation }: any) => {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingProducts();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Dashboard fetch başladı, token:', token ? 'var' : 'YOK');
      console.log('URL:', `${API_URL}/admin/dashboard`);
      
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Dashboard response:', response.data);
      setData(response.data);
    } catch (error: any) {
      console.error('Dashboard hatası:', error.response?.data || error.message);
      Alert.alert('Hata', `Dashboard verileri yüklenemedi: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/pending-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingProducts(response.data);
    } catch (error: any) {
      console.error('Onay bekleyen ürünler yüklenemedi:', error);
    }
  };

  const handleApproveProduct = async (productId: string) => {
    try {
      await axios.post(`${API_URL}/admin/approve-product/${productId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Başarılı', 'Ürün onaylandı');
      fetchPendingProducts();
      fetchDashboardData();
    } catch (error: any) {
      Alert.alert('Hata', 'Ürün onaylanamadı');
    }
  };

  const handleRejectProduct = async (productId: string) => {
    Alert.alert(
      'Ürünü Reddet',
      'Bu ürünü reddetmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(`${API_URL}/admin/reject-product/${productId}`, {}, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Başarılı', 'Ürün reddedildi');
              fetchPendingProducts();
              fetchDashboardData();
            } catch (error: any) {
              Alert.alert('Hata', 'Ürün reddedilemedi');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    await fetchPendingProducts();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  if (loading && !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#007AFF"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Paneli</Text>
          <Text style={styles.adminEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {data && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCard1]}>
            <Text style={styles.statNumber}>{data.stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
          </View>

          <View style={[styles.statCard, styles.statCard2]}>
            <Text style={styles.statNumber}>{data.stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Toplam Ürün</Text>
          </View>

          <View style={[styles.statCard, styles.statCard3]}>
            <Text style={styles.statNumber}>{data.stats.pendingProducts}</Text>
            <Text style={styles.statLabel}>Onay Bekleyen</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCard1]}>
            <Text style={styles.statNumber}>{data.stats.activeProducts}</Text>
            <Text style={styles.statLabel}>Aktif Ürün</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>👥 Kullanıcıları Görüntüle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📋 Tüm İlanları Görüntüle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>⭐ Değerlendirmeleri Yönet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📊 Raporları İndir</Text>
        </TouchableOpacity>
      </View>

      {/* Pending Products - Onay Bekleyen Ürünler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Onay Bekleyen Ürünler ({pendingProducts.length})
        </Text>
        {pendingProducts.length > 0 ? (
          pendingProducts.map((product: any) => (
            <View key={product.id} style={styles.pendingProductCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productDetails}>
                  {product.seller?.fullName} • ₺{product.price}
                </Text>
                <Text style={styles.productDetails}>
                  {product.category?.name} • {product.condition}
                </Text>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApproveProduct(product.id)}
                >
                  <Text style={styles.approveButtonText}>✓ Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRejectProduct(product.id)}
                >
                  <Text style={styles.rejectButtonText}>✕ Reddet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Onay bekleyen ürün yok</Text>
        )}
      </View>

      {/* Recent Users */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Kayıt Olan Kullanıcılar</Text>
        {data && data.recentUsers.length > 0 ? (
          data.recentUsers.map((user: any) => (
            <View key={user.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{user.fullName}</Text>
                <Text style={styles.listItemSubtitle}>{user.email}</Text>
              </View>
              <Text style={styles.listItemDate}>
                {new Date(user.createdAt).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Henüz kullanıcı yok</Text>
        )}
      </View>

      {/* Recent Products */}
      <View style={[styles.section, { marginBottom: 30 }]}>
        <Text style={styles.sectionTitle}>Son Eklenen Ürünler</Text>
        {data && data.recentProducts.length > 0 ? (
          data.recentProducts.map((product: any) => (
            <View key={product.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{product.title}</Text>
                <Text style={styles.listItemSubtitle}>
                  {product.seller?.fullName || 'Bilinmeyen'} • ₺{product.price}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{product.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Henüz ürün yok</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  adminEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  statCard1: {
    backgroundColor: '#e3f2fd',
  },
  statCard2: {
    backgroundColor: '#f3e5f5',
  },
  statCard3: {
    backgroundColor: '#e8f5e9',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  listItemDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  pendingProductCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9500',
  },
  productInfo: {
    marginBottom: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#34c759',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AdminDashboardScreen;