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
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { AvatarPicker } from '../../components/AvatarPicker';

// --- TİP TANIMLAMALARI ---
interface Product {
  id: string;
  title: string;
  price: number;
  images?: { imageUrl: string }[];
}

interface UserProfile {
  fullName: string; // Backend'deki DTO ile aynı yapıldı
  profilePhoto?: string;
  isPremium?: boolean;
  university?: { name: string };
}

// --- YARDIMCI FONKSİYONLAR ---
const getImageUrl = (url?: string) => {
  if (!url) return null;
  if (Platform.OS === 'android' && url.includes('localhost')) {
    return url.replace('localhost', '10.0.2.2');
  }
  return url;
};

export const UserProfileScreen = ({ navigation, route }: any) => {
  const { user: currentUser, token, logout, userId: myId } = useAuth();
  
  const targetUserId = route?.params?.userId || myId;
  const isOwner = targetUserId === myId;

  // --- State'ler ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'favorites'>('products');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: profile?.fullName || 'Profil', // Düzeltildi
      headerRight: () => isOwner ? (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 10 }}>
            <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '500' }}>Çıkış</Text>
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isOwner, profile]);

  const fetchFavorites = async () => {
    if (!isOwner) return;
    
    try {
      const fetchedFavorites = await api.getFavorites();
      setFavorites(fetchedFavorites);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Favoriler yüklenemedi');
      setFavorites([]); 
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      if (isOwner) {
        // 👑 SENIOR DOKUNUŞU: Kendi profilimiz için API'ye gitmek yerine
        // doğrudan AuthContext içindeki en güncel (Trafik Polisi'nden) datasını kullanıyoruz!
        setProfile(currentUser as unknown as UserProfile); 
        await fetchFavorites();
      } else {
        const userProfile = await api.getPublicUserProfile(targetUserId);
        if (userProfile) {
          setProfile(userProfile as unknown as UserProfile);
        }
      }

      const stats = await api.getFollowStats(targetUserId);
      setFollowStats(stats);

      if (!isOwner) {
        const followStatus = await api.checkIsFollowing(targetUserId);
        setIsFollowing(followStatus.isFollowing);
      }

      const userProducts = await api.getUserProducts(targetUserId);
      setProducts(userProducts as Product[]);

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
    } catch (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
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

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await api.removeFavorite(productId);
      setFavorites(prev => prev.filter(p => p.id !== productId));
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Favorilerden kaldırılamadı');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderProfileHeader = () => (
    <View style={styles.profileContainer}>
        <View style={styles.avatarWrapper}>
            {isOwner ? (
                 <AvatarPicker 
                    avatarUrl={getImageUrl(profile?.profilePhoto) || undefined}
                    onUploadSuccess={(url) => setProfile(prev => prev ? {...prev, profilePhoto: url} : null)}
                    size={90}
                 />
            ) : (
                profile?.profilePhoto ? (
                    <Image source={{ uri: getImageUrl(profile.profilePhoto)! }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                        {/* Avatar'da ismin ilk harfini göstermek için düzeltildi */}
                        <Text style={styles.avatarText}>
                            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                )
            )}
            {profile?.isPremium && (
                <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>PRO</Text>
                </View>
            )}
        </View>

        {/* Ekranda ismin düzgün görünmesi için düzeltildi */}
        <Text style={styles.fullName}>
            {profile?.fullName || 'Kullanıcı'} 
        </Text>
        <Text style={styles.universityText}>
            {profile?.university?.name || 'Sakarya Üniversitesi'}
        </Text>
        
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

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
        style={styles.productCard}
        onPress={() => navigation.push('ProductDetail', { productId: item.id })}
    >
        <Image 
            source={{ uri: getImageUrl(item.images?.[0]?.imageUrl) || 'https://via.placeholder.com/150' }} 
            style={styles.productImage} 
        />
        
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
        keyExtractor={(item, index) => item?.id ? item.id.toString() : index.toString()}
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
  profileContainer: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 20, backgroundColor: '#fff' },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  placeholderAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, color: '#666', fontWeight: 'bold' },
  premiumBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 2, borderColor: '#fff' },
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
  removeButton: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 59, 48, 0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  removeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: '#ccc', fontSize: 14, textAlign: 'center' },
});