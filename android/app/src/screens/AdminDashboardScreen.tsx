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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Backend'den dashboard verilerini çek (henüz oluşturulmadı)
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (error) {
      Alert.alert('Hata', 'Dashboard verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
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
            <Text style={styles.statNumber}>{data.stats.totalListings}</Text>
            <Text style={styles.statLabel}>Ürün İlanı</Text>
          </View>

          <View style={[styles.statCard, styles.statCard3]}>
            <Text style={styles.statNumber}>{data.stats.totalReviews}</Text>
            <Text style={styles.statLabel}>Değerlendirme</Text>
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

      {/* Recent Listings */}
      <View style={[styles.section, { marginBottom: 30 }]}>
        <Text style={styles.sectionTitle}>Son Eklenen İlanlar</Text>
        {data && data.recentListings.length > 0 ? (
          data.recentListings.map((listing: any) => (
            <View key={listing.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{listing.title}</Text>
                <Text style={styles.listItemSubtitle}>
                  {listing.user.fullName} • ₺{listing.price}
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Sil</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Henüz ilan yok</Text>
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
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AdminDashboardScreen;