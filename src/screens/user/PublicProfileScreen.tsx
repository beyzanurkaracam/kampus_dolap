import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string;
  fullName: string;
  profilePhoto?: string;
  university?: { id?: string; name: string; domain?: string } | string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  images?: Array<{ imageUrl: string }>;
  seller?: PublicProfile;
}

type Navigation = {
  goBack: () => void;
  push: (screen: string, params: Record<string, unknown>) => void;
};

type Route = { params: { userId: string } };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUniversityName(university: PublicProfile['university']): string {
  if (!university) return '';
  return typeof university === 'string' ? university : university.name;
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  item: Product;
  onPress: () => void;
}

const ProductCard = memo(({ item, onPress }: ProductCardProps) => (
  <TouchableOpacity style={styles.productItem} onPress={onPress}>
    <Image
      source={{ uri: item.images?.[0]?.imageUrl ?? 'https://via.placeholder.com/150' }}
      style={styles.productImage}
    />
    <View style={styles.productInfo}>
      <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.productPrice}>₺{item.price}</Text>
    </View>
  </TouchableOpacity>
));

// ─── Screen ───────────────────────────────────────────────────────────────────

export const PublicProfileScreen = ({ route, navigation }: { route: Route; navigation: Navigation }) => {
  const { userId } = route.params;
  const { userId: currentUserId } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [followLoading, setFollowLoading] = useState(false);

  const isMe = userId === currentUserId;

  useEffect(() => {
    const load = async () => {
      try {
        const [allProducts, stats, followStatus] = await Promise.all([
          api.getUserProducts(userId),
          api.getFollowStats(userId),
          isMe ? Promise.resolve({ isFollowing: false }) : api.checkIsFollowing(userId),
        ]);

        const userProducts = allProducts.filter((p: Product) => p.seller?.id === userId);
        setProducts(userProducts);
        if (userProducts.length > 0) setProfile(userProducts[0].seller ?? null);

        setFollowStats(stats);
        setIsFollowing(followStatus.isFollowing);
      } catch {
        Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, isMe]);

  const handleFollowToggle = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(userId);
        setIsFollowing(false);
        setFollowStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await api.followUser(userId);
        setIsFollowing(true);
        setFollowStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error: any) {
      Alert.alert('Hata', error?.message ?? 'İşlem başarısız');
    } finally {
      setFollowLoading(false);
    }
  }, [userId, isFollowing, followLoading]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        item={item}
        onPress={() => navigation.push('ProductDetail', { productId: item.id })}
      />
    ),
    [navigation],
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Geri</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Text style={styles.avatarText}>{profile?.fullName?.charAt(0) ?? 'U'}</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{profile?.fullName ?? 'Kullanıcı'}</Text>
          <Text style={styles.university}>{getUniversityName(profile?.university)}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{products.length}</Text>
              <Text style={styles.statLabel}>Ürün</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followStats.followers}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followStats.following}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
          </View>

          {!isMe && (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollowToggle}
              disabled={followLoading}
              accessibilityRole="button"
              accessibilityLabel={isFollowing ? 'Takipten çık' : 'Takip et'}
            >
              {followLoading ? (
                <ActivityIndicator color={isFollowing ? '#007AFF' : '#fff'} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Satıştaki Ürünler ({products.length})</Text>
          {products.length === 0 ? (
            <Text style={styles.emptyText}>Henüz aktif ilanı yok.</Text>
          ) : (
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.listRow}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 15, paddingTop: 50, backgroundColor: '#fff' },
  backButton: { padding: 5 },
  backButtonText: { fontSize: 18, color: '#007AFF' },
  scrollContent: { paddingBottom: 30 },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  placeholderAvatar: { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, color: '#666', fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  university: { fontSize: 14, color: '#888', marginTop: 5 },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 20,
    width: '80%',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#888' },
  statDivider: { width: 1, height: '100%', backgroundColor: '#eee' },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 150,
    alignItems: 'center',
  },
  followButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  followingButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#007AFF' },
  followingButtonText: { color: '#007AFF' },
  productsSection: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  listRow: { justifyContent: 'space-between' },
  productItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  productImage: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  productInfo: { alignItems: 'flex-start' },
  productTitle: { fontSize: 14, color: '#333', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
});
