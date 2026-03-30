import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DashboardData } from '../../types/dashboard.types';

import { Product } from 'backend/src/entities/product.entity';

const AdminDashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'pending' | 'users' | 'products'>('pending');

  // 👑 SENIOR DOKUNUŞU: Tüm verileri tek seferde ve güvenli (Memory Leak'siz) çekiyoruz
  const fetchAllData = useCallback(async () => {
    try {
      // Promise.all ile istekleri paralel (aynı anda) atarak süreyi yarıya indiriyoruz
      const [dashboardResponse, pendingResponse] = await Promise.all([
        api.getAdminDashboardStats(),
        api.getPendingProducts()
      ]);

      setData(dashboardResponse);
      setPendingProducts(pendingResponse);
    } catch (error: any) {
      console.error('Admin Veri Çekme Hatası:', error.message);
      Alert.alert('Hata', `Veriler yüklenemedi: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleApproveProduct = async (productId: string) => {
    try {
      await api.approveProduct(productId);
      Alert.alert('Başarılı', 'Ürün başarıyla onaylandı ve yayına alındı.');
      // Listeleri güncellemek için tekrar veri çekiyoruz
      fetchAllData(); 
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Ürün onaylanamadı');
    }
  };

  const handleRejectProduct = async (productId: string) => {
    Alert.alert(
      'Ürünü Reddet',
      'Bu ürünü reddetmek ve silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.rejectProduct(productId);
              Alert.alert('Başarılı', 'Ürün reddedildi.');
              fetchAllData();
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Ürün reddedilemedi');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleLogout = async () => {
    // 👑 SENIOR DOKUNUŞU: navigation.reset SİLİNDİ! Trafik Polisi (AuthContext) halledecek.
    await logout();
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
      showsVerticalScrollIndicator={false}
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
          activeOpacity={0.8}
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

      {/* Section Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeSection === 'pending' && styles.activeTabButton]}
          onPress={() => setActiveSection('pending')}
        >
          <Text style={[styles.tabButtonText, activeSection === 'pending' && styles.activeTabButtonText]}>
            📦 Onay Bekleyen ({pendingProducts.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeSection === 'users' && styles.activeTabButton]}
          onPress={() => setActiveSection('users')}
        >
          <Text style={[styles.tabButtonText, activeSection === 'users' && styles.activeTabButtonText]}>
            👥 Kullanıcılar ({data?.recentUsers?.length || 0})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeSection === 'products' && styles.activeTabButton]}
          onPress={() => setActiveSection('products')}
        >
          <Text style={[styles.tabButtonText, activeSection === 'products' && styles.activeTabButtonText]}>
            📋 Ürünler ({data?.recentProducts?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pending Products - Onay Bekleyen Ürünler */}
      {activeSection === 'pending' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onay Bekleyen Ürünler</Text>
          {pendingProducts.length > 0 ? (
            pendingProducts.map((product) => (
              <View key={product.id} style={styles.pendingProductCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productDetails}>
                    {product.seller?.fullName || 'Bilinmeyen Satıcı'} • ₺{product.price}
                  </Text>
                  <Text style={styles.productDetails}>
                    {(product as any).category?.name || 'Kategori Yok'} • {(product as any).condition || 'Durum Belirtilmemiş'}
                  </Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApproveProduct(product.id.toString())}
                  >
                    <Text style={styles.approveButtonText}>✓ Onayla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRejectProduct(product.id.toString())}
                  >
                    <Text style={styles.rejectButtonText}>✕ Reddet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Şu an onay bekleyen ürün bulunmuyor.</Text>
          )}
        </View>
      )}

      {/* Recent Users */}
      {activeSection === 'users' && data && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Son Kayıt Olan Kullanıcılar</Text>
          {data.recentUsers && data.recentUsers.length > 0 ? (
            data.recentUsers.map((userObj: any) => (
              <View key={userObj.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{userObj.fullName}</Text>
                  <Text style={styles.listItemSubtitle}>{userObj.email}</Text>
                </View>
                <Text style={styles.listItemDate}>
                  {userObj.createdAt ? new Date(userObj.createdAt).toLocaleDateString('tr-TR') : '-'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz kullanıcı yok</Text>
          )}
        </View>
      )}

      {/* Recent Products */}
      {activeSection === 'products' && data && (
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Son Eklenen Ürünler</Text>
          {data.recentProducts && data.recentProducts.length > 0 ? (
            data.recentProducts.map((productObj: any) => (
              <View key={productObj.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{productObj.title}</Text>
                  <Text style={styles.listItemSubtitle}>
                    {productObj.seller?.fullName || 'Bilinmeyen'} • ₺{productObj.price}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{productObj.status || 'Bilinmiyor'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz ürün yok</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// Styles tamamen aynı bırakıldı, çünkü arayüz tasarımın zaten başarılıydı!
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  header: { backgroundColor: '#fff', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  greeting: { fontSize: 14, color: '#999' },
  adminEmail: { fontSize: 16, fontWeight: '600', color: '#333' },
  logoutButton: { backgroundColor: '#ff3b30', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tabButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
  activeTabButton: { backgroundColor: '#007AFF' },
  tabButtonText: { fontSize: 12, fontWeight: '600', color: '#666', textAlign: 'center' },
  activeTabButtonText: { color: '#fff' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 15, gap: 10 },
  statCard: { flex: 1, borderRadius: 10, padding: 15, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  statCard1: { backgroundColor: '#e3f2fd' },
  statCard2: { backgroundColor: '#f3e5f5' },
  statCard3: { backgroundColor: '#e8f5e9' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  section: { backgroundColor: '#fff', marginHorizontal: 10, marginVertical: 10, borderRadius: 10, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 15 },
  actionButton: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  actionButtonText: { fontSize: 14, color: '#333', fontWeight: '500' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  listItemSubtitle: { fontSize: 12, color: '#999' },
  listItemDate: { fontSize: 12, color: '#999' },
  deleteButton: { backgroundColor: '#ff3b30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginLeft: 10 },
  deleteButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statusBadge: { backgroundColor: '#e0e0e0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginLeft: 10 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#666', textTransform: 'capitalize' },
  pendingProductCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#ff9500' },
  productInfo: { marginBottom: 12 },
  productTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  productDetails: { fontSize: 13, color: '#666', marginTop: 2 },
  productActions: { flexDirection: 'row', gap: 10 },
  approveButton: { flex: 1, backgroundColor: '#34c759', padding: 10, borderRadius: 6, alignItems: 'center' },
  approveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rejectButton: { flex: 1, backgroundColor: '#ff3b30', padding: 10, borderRadius: 6, alignItems: 'center' },
  rejectButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});

export default AdminDashboardScreen;