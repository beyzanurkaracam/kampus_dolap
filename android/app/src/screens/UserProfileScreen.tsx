import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AvatarPicker } from '../components/AvatarPicker';
import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

export const UserProfileScreen = ({ navigation, route }: any) => {
  const { user: currentUser, token, logout, userId: myId } = useAuth();
  
  // Parametre gelmediyse kendi profilimi aç
  const targetUserId = route?.params?.userId || myId;
  const isOwner = targetUserId === myId;

  // --- State'ler ---
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Takip State'leri
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [favorites, setFavorites] = useState<any[]>([]);
  const [followLoading, setFollowLoading] = useState(false);

  // Sekmeler
  const [activeTab, setActiveTab] = useState<'products' | 'favorites'>('products');

  // --- 1. Header Ayarları (Native Header İçin) ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: profile?.fullName || 'Profil',
      headerRight: () => isOwner ? (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 10 }}>
            <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '500' }}>Çıkış</Text>
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isOwner, profile]);

  // ✅ Favorileri çekme fonksiyonu - GÜÇLENDİRİLMİŞ
  const fetchFavorites = async () => {
    if (!isOwner) {
      console.log('⚠️ Başkasının profilinde favoriler gösterilmiyor');
      return;
    }
    
    try {
      console.log('📥 Favoriler çekiliyor...');
      console.log('🔑 Token:', token ? 'Var' : 'YOK!');
      console.log('🌐 API URL:', `${API_URL}/products/favorites`);
      
      const response = await axios.get(`${API_URL}/products/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10 saniye timeout
      });
      
      console.log('✅ API Yanıtı:', response.status);
      console.log('✅ Favoriler:', response.data);
      
      // Veriyi kontrol et
      if (Array.isArray(response.data)) {
        console.log(`✅ ${response.data.length} adet favori ürün bulundu`);
        setFavorites(response.data);
      } else if (response.data?.favorites && Array.isArray(response.data.favorites)) {
        // Backend bazen {favorites: [...]} şeklinde dönebilir
        console.log(`✅ ${response.data.favorites.length} adet favori ürün bulundu (nested)`);
        setFavorites(response.data.favorites);
      } else {
        console.warn('⚠️ Beklenmeyen veri formatı:', typeof response.data);
        setFavorites([]);
      }
      
    } catch (error: any) {
      console.error('❌ Favoriler yüklenirken HATA:');
      console.error('  - Status:', error.response?.status);
      console.error('  - Data:', error.response?.data);
      console.error('  - Message:', error.message);
      
      if (error.response?.status === 404) {
        console.log('ℹ️ Favorites endpoint bulunamadı - Backend kontrolü gerekli');
        Alert.alert('Bilgi', 'Favoriler özelliği henüz aktif değil');
      } else if (error.response?.status === 401) {
        console.log('🔒 Token geçersiz veya süresi dolmuş');
        Alert.alert('Hata', 'Oturum süreniz dolmuş, lütfen tekrar giriş yapın');
      } else {
        Alert.alert('Hata', 'Favoriler yüklenemedi: ' + (error.response?.data?.message || error.message));
      }
      
      setFavorites([]); // Hata durumunda boş array
    }
  };

  // --- Veri Çekme ---
  const fetchAllData = useCallback(async () => {
    try {
      if (isOwner) {
        const myProfile = await api.getProfile();
        setProfile(myProfile);
        
        // ✅ Favorileri de çek
        await fetchFavorites();
      } else {
        const userProfile = await api.getPublicUserProfile(targetUserId);
        setProfile(userProfile);
      }

      const stats = await api.getFollowStats(targetUserId);
      setFollowStats(stats);

      if (!isOwner) {
        const followStatus = await api.checkIsFollowing(targetUserId);
        setIsFollowing(followStatus.isFollowing);
      }

      const userProducts = await api.getUserProducts(targetUserId);
      setProducts(userProducts);

    } catch (error) {
      console.error('Profil verileri alınamadı:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId, isOwner]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
        fetchAllData();
    });
    return unsubscribe;
  }, [navigation, fetchAllData]);

  // --- Aksiyonlar ---
  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(targetUserId);
        setIsFollowing(false);
        setFollowStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        await api.followUser(targetUserId);
        setIsFollowing(true);
        setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error: any) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    Alert.alert('Mesaj', 'Bu özellik yakında eklenecek!');
  };

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { 
        text: 'Çıkış', 
        style: 'destructive', 
        onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      }
    ]);
  };

  // ✅ Favori silme işlemi
  const handleRemoveFavorite = async (productId: string) => {
    try {
      await axios.delete(`${API_URL}/products/favorites/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // State'ten kaldır
      setFavorites(prev => prev.filter(p => p.id !== productId));
      Alert.alert('Başarılı', 'Favorilerden kaldırıldı');
    } catch (error) {
      Alert.alert('Hata', 'Favorilerden kaldırılamadı');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // --- Profil İçeriği ---
  const renderProfileHeader = () => (
    <View style={styles.profileContainer}>
        
        {/* Profil Resmi */}
        <View style={styles.avatarWrapper}>
            {isOwner ? (
                 <AvatarPicker 
                    avatarUrl={profile?.profilePhoto}
                    token={token!}
                    onUploadSuccess={(url) => setProfile((prev:any) => ({...prev, profilePhoto: url}))}
                    size={90}
                 />
            ) : (
                profile?.profilePhoto ? (
                    <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                        <Text style={styles.avatarText}>{profile?.fullName?.charAt(0) || 'U'}</Text>
                    </View>
                )
            )}
            {profile?.isPremium && (
                <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PRO</Text>
                </View>
            )}
        </View>

        <Text style={styles.fullName}>{profile?.fullName || 'Kullanıcı'}</Text>
        <Text style={styles.universityText}>
            {profile?.university?.name || 'Sakarya Üniversitesi'}
        </Text>
        
        {/* İstatistikler */}
        <View style={styles.statsRow}>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{products.length}</Text>
                <Text style={styles.statLabel}>İlanlar</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followStats.followers}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followStats.following}</Text>
                <Text style={styles.statLabel}>Takip</Text>
            </View>
        </View>

        {/* Butonlar */}
        <View style={styles.actionButtons}>
            {isOwner ? (
                <>
                    <TouchableOpacity style={[styles.button, styles.editButton]}>
                        <Text style={styles.buttonTextBlack}>Profili Düzenle</Text>
                    </TouchableOpacity>
                    {!profile?.isPremium && (
                        <TouchableOpacity 
                            style={[styles.button, styles.premiumButton]}
                            onPress={() => navigation.navigate('Premium')}
                        >
                            <Text style={styles.buttonTextWhite}>Premium'a Geç</Text>
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                <>
                    <TouchableOpacity 
                        style={[styles.button, isFollowing ? styles.followingButton : styles.followButton]}
                        onPress={handleFollowToggle}
                        disabled={followLoading}
                    >
                        {followLoading ? (
                            <ActivityIndicator color={isFollowing ? "#007AFF" : "#fff"} />
                        ) : (
                            <Text style={isFollowing ? styles.followingButtonText : styles.buttonTextWhite}>
                                {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.button, styles.messageButton]}
                        onPress={handleMessage}
                    >
                        <Text style={styles.buttonTextBlack}>Mesaj</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>

        {/* Tablar */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'products' && styles.activeTab]}
                onPress={() => setActiveTab('products')}
            >
                <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
                    İlanlar ({products.length})
                </Text>
            </TouchableOpacity>
            
            {isOwner && (
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
                    onPress={() => {
                        setActiveTab('favorites');
                        // Sekmeye tıklandığında favorileri yeniden yükle
                        console.log('🔄 Favoriler sekmesi açıldı, yeniden yükleniyor...');
                        fetchFavorites();
                    }}
                >
                    <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
                        Favoriler ({favorites.length})
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
  );

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity 
        style={styles.productCard}
        onPress={() => navigation.push('ProductDetail', { productId: item.id })}
    >
        <Image 
            source={{ uri: item.images?.[0]?.imageUrl || 'https://via.placeholder.com/150' }} 
            style={styles.productImage} 
        />
        
        {/* ✅ Favoriler sekmesinde çarpı butonu ekle */}
        {activeTab === 'favorites' && (
            <TouchableOpacity 
                style={styles.removeButton}
                onPress={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(item.id);
                }}
            >
                <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
        )}
        
        <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.productPrice}>₺{item.price}</Text>
        </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activeTab === 'products' ? products : favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        ListHeaderComponent={renderProfileHeader}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                    {activeTab === 'products' ? 'Henüz ilan yok.' : 'Favori ürün yok.'}
                </Text>
                {activeTab === 'favorites' && (
                    <Text style={styles.emptySubtext}>
                        Beğendiğin ürünleri buradan takip edebilirsin
                    </Text>
                )}
            </View>
        }
        columnWrapperStyle={styles.listColumnWrapper}
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAllData(); }} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  profileContainer: { 
      alignItems: 'center', 
      paddingTop: 20, 
      paddingHorizontal: 20, 
      backgroundColor: '#fff' 
  },

  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  placeholderAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, color: '#666', fontWeight: 'bold' },
  
  premiumBadge: { 
    position: 'absolute', bottom: 0, right: 0, 
    backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, 
    borderRadius: 10, borderWidth: 2, borderColor: '#fff' 
  },
  premiumText: { fontSize: 10, fontWeight: 'bold', color: '#000' },

  fullName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  universityText: { fontSize: 14, color: '#666', marginBottom: 15 },

  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#888' },
  verticalDivider: { width: 1, height: '100%', backgroundColor: '#E5E5EA' },

  actionButtons: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 },
  button: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  editButton: { backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#D1D1D6' },
  premiumButton: { backgroundColor: '#000' },
  followButton: { backgroundColor: '#007AFF' },
  followingButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#007AFF' },
  messageButton: { backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#D1D1D6' },
  
  buttonTextWhite: { color: '#fff', fontWeight: '600' },
  buttonTextBlack: { color: '#333', fontWeight: '600' },
  followingButtonText: { color: '#007AFF', fontWeight: '600' },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', width: '100%' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#333' },
  tabText: { fontSize: 14, color: '#888', fontWeight: '600' },
  activeTabText: { color: '#333' },

  listColumnWrapper: { justifyContent: 'space-between', paddingHorizontal: 10, marginTop: 10 },
  productCard: { width: '48%', backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, position: 'relative' },
  productImage: { width: '100%', height: 160, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#f0f0f0' },
  productInfo: { padding: 8 },
  productTitle: { fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: '#007AFF' },

  // ✅ Favorilerden kaldırma butonu
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: '#ccc', fontSize: 14, textAlign: 'center' },
});