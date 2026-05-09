import React, { memo, useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import api, { User } from '../../services/api';
import { AvatarPicker } from '../../components/AvatarPicker';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile extends Omit<User, 'university'> {
  department?: string;
  profilePhoto?: string;
  university?: { id?: string; name: string; domain?: string } | string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  images: Array<{ imageUrl: string; isPrimary: boolean }>;
  seller?: { fullName: string };
}

type TabType = 'products' | 'favorites';

type Navigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  replace: (screen: string) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StatusInfo = { text: string; color: string; bgColor: string };

function getStatusInfo(status: string): StatusInfo {
  switch (status) {
    case 'active':   return { text: 'Aktif',         color: '#34c759', bgColor: '#e8f5e9' };
    case 'pending':  return { text: 'Onay Bekliyor', color: '#ff9500', bgColor: '#fff3e0' };
    case 'sold':     return { text: 'Satıldı',       color: '#666',    bgColor: '#f0f0f0' };
    case 'reserved': return { text: 'Rezerve',       color: '#007AFF', bgColor: '#e3f2fd' };
    case 'removed':  return { text: 'Reddedildi',    color: '#ff3b30', bgColor: '#ffebee' };
    default:         return { text: 'Bilinmiyor',    color: '#999',    bgColor: '#f5f5f5' };
  }
}

function getPrimaryImage(images: Product['images']): string {
  return (
    images.find((img) => img.isPrimary)?.imageUrl ??
    images[0]?.imageUrl ??
    'https://via.placeholder.com/150'
  );
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  item: Product;
  onPress: () => void;
}

const ProductCard = memo(({ item, onPress }: ProductCardProps) => {
  const status = getStatusInfo(item.status);
  return (
    <TouchableOpacity style={styles.productItem} onPress={onPress}>
      <Image source={{ uri: getPrimaryImage(item.images) }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.productPrice}>{item.price} ₺</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <Text style={[styles.productStatus, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── FavoriteCard ─────────────────────────────────────────────────────────────

interface FavoriteCardProps {
  item: Product;
  onPress: () => void;
  onRemove: () => void;
}

const FavoriteCard = memo(({ item, onPress, onRemove }: FavoriteCardProps) => (
  <TouchableOpacity style={styles.productItem} onPress={onPress}>
    <Image source={{ uri: getPrimaryImage(item.images) }} style={styles.productImage} />
    <TouchableOpacity style={styles.favoriteButtonOnCard} onPress={onRemove}>
      <Text style={styles.heartIconOnCard}>❤️</Text>
    </TouchableOpacity>
    <View style={styles.productInfo}>
      <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.productPrice}>{item.price} ₺</Text>
      <Text style={styles.productSeller}>{item.seller?.fullName ?? 'Bilinmeyen'}</Text>
    </View>
  </TouchableOpacity>
));

// ─── Screen ───────────────────────────────────────────────────────────────────

export const ProfileScreen = ({ navigation }: { navigation: Navigation }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // --- Data fetchers ---

  useEffect(() => {
    api
      .getProfile()
      .then((data) => setProfile(data as Profile))
      .catch((error: any) => {
        if (error.message === 'Failed to fetch profile') {
          Alert.alert('Oturum Sonlandı', 'Lütfen tekrar giriş yapın', [
            {
              text: 'Tamam',
              onPress: () => { api.logout(); navigation.replace('Login'); },
            },
          ]);
        } else {
          Alert.alert('Hata', error?.message ?? 'Profil bilgileri yüklenemedi');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchProducts = useCallback(async () => {
    setDataLoading(true);
    try {
      setProducts(await api.getMyProducts());
    } catch {
      Alert.alert('Hata', 'Ürünler yüklenemedi');
    } finally {
      setDataLoading(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    setDataLoading(true);
    try {
      setFavorites(await api.getFavorites());
    } catch {
      setFavorites([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Refresh products on re-focus (e.g. after adding a product)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts]),
  );

  // Lazy-load favorites only when switching to that tab
  useEffect(() => {
    if (activeTab === 'favorites') fetchFavorites();
  }, [activeTab, fetchFavorites]);

  // --- Handlers ---

  const handleRemoveFavorite = useCallback(async (productId: string) => {
    try {
      await api.removeFavorite(productId);
      setFavorites((prev) => prev.filter((p) => p.id !== productId));
    } catch {
      Alert.alert('Hata', 'Favorilerden kaldırılamadı');
    }
  }, []);

  const handleLogout = useCallback(() => {
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
  }, [navigation]);

  // --- Render helpers ---

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        item={item}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      />
    ),
    [navigation],
  );

  const renderFavorite = useCallback(
    ({ item }: { item: Product }) => (
      <FavoriteCard
        item={item}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        onRemove={() => handleRemoveFavorite(item.id)}
      />
    ),
    [navigation, handleRemoveFavorite],
  );

  // --- Loading state ---

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AvatarPicker
          avatarUrl={profile?.profilePhoto}
          onUploadSuccess={(url) =>
            setProfile((prev) => (prev ? { ...prev, profilePhoto: url } : null))
          }
          size={100}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>{profile?.fullName ?? 'Kullanıcı'}</Text>
          {profile?.isPremium && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.userEmail}>{profile?.email}</Text>
        <Text style={styles.editPhotoHint}>Fotoğrafı değiştirmek için dokunun</Text>
      </View>

      {!profile?.isPremium && (
        <View style={styles.premiumBannerContainer}>
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => navigation.navigate('Premium')}
          >
            <View style={styles.premiumContent}>
              <View>
                <Text style={styles.premiumTitle}>Premium'a Geç 👑</Text>
                <Text style={styles.premiumSubtitle}>Ayrıcalıklı özellikleri keşfet</Text>
              </View>
              <Text style={styles.premiumArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabContainer}>
        {(['products', 'favorites'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'products'
                ? `İlanlarım (${products.length})`
                : `Favorilerim (${favorites.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {dataLoading ? (
        <View style={styles.dataLoadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <>
          <FlatList
            data={activeTab === 'products' ? products : favorites}
            renderItem={activeTab === 'products' ? renderProduct : renderFavorite}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {activeTab === 'products' ? 'Henüz ürün eklemediniz' : 'Henüz favori ürün yok'}
                </Text>
              </View>
            }
          />
          {activeTab === 'products' && (
            <TouchableOpacity
              style={styles.floatingAddButton}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <Text style={styles.floatingAddButtonText}>+</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  dataLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  nameContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5, gap: 8 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  proBadge: { backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E6C200' },
  proText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  userEmail: { fontSize: 14, color: '#666' },
  editPhotoHint: { fontSize: 12, color: '#007AFF', marginTop: 8 },
  premiumBannerContainer: { paddingHorizontal: 10, marginTop: 15, marginBottom: 5 },
  premiumButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumTitle: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  premiumSubtitle: { color: '#e0e0e0', fontSize: 12 },
  premiumArrow: { color: '#FFD700', fontSize: 20, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 16, fontWeight: '500', color: '#666' },
  activeTabText: { color: '#007AFF', fontWeight: '600' },
  listContainer: { padding: 10, paddingBottom: 80 },
  productItem: { flex: 1, margin: 5, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', maxWidth: '48%' },
  productImage: { width: '100%', height: 150, backgroundColor: '#f0f0f0' },
  favoriteButtonOnCard: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
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
  heartIconOnCard: { fontSize: 20 },
  productInfo: { padding: 10 },
  productTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
  productSeller: { fontSize: 12, color: '#666', marginBottom: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  productStatus: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 20 },
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
  floatingAddButtonText: { color: '#fff', fontSize: 32, fontWeight: '300' },
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
  logoutButtonText: { color: '#ff3b30', fontSize: 16, fontWeight: '600' },
});
