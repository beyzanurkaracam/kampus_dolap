import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Listing } from '../../types/listing.types';
import api from '../../services/api';
import { getImageUrl } from '../../utils/productHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────

type SortBy = 'newest' | 'price_asc' | 'price_desc';

type Navigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat (Artan)' },
  { value: 'price_desc', label: 'Fiyat (Azalan)' },
];

// ─── ListingCard ─────────────────────────────────────────────────────────────

interface ListingCardProps {
  item: Listing;
  isFavorite: boolean;
  onPress: (id: string) => void;
  onFavoriteToggle: (id: string) => void;
}

const ListingCard = memo(({ item, isFavorite, onPress, onFavoriteToggle }: ListingCardProps) => {
  const primaryImage = item.images?.length > 0 ? getImageUrl(item.images[0].imageUrl) : null;
  const seller = item.seller as (typeof item.seller & { isPremium?: boolean }) | undefined;

  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
  const handleFav = useCallback(
    (e: any) => { e.stopPropagation(); onFavoriteToggle(item.id); },
    [item.id, onFavoriteToggle],
  );

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handlePress}>
      {primaryImage ? (
        <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>📦</Text>
          <Text style={styles.placeholderText}>Resim Yok</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity style={styles.favoriteButton} onPress={handleFav}>
            <Text style={[styles.heartIcon, isFavorite && styles.heartIconActive]}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.price}>₺{item.price.toLocaleString('tr-TR')}</Text>
        <View style={styles.sellerRow}>
          <Text style={styles.seller}>{seller?.fullName ?? 'Bilinmeyen'}</Text>
          {seller?.isPremium && <Text style={styles.premiumBadge}>⭐</Text>}
        </View>
        <Text style={styles.category}>{item.category?.name ?? 'Diğer'}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── FilterModal ─────────────────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  initialSortBy: SortBy;
  initialMinPrice: string;
  initialMaxPrice: string;
  onApply: (sortBy: SortBy, minPrice: string, maxPrice: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const FilterModal = memo(({
  visible,
  initialSortBy,
  initialMinPrice,
  initialMaxPrice,
  onApply,
  onClear,
  onClose,
}: FilterModalProps) => {
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);

  useEffect(() => {
    if (visible) {
      setSortBy(initialSortBy);
      setMinPrice(initialMinPrice);
      setMaxPrice(initialMaxPrice);
    }
  }, [visible, initialSortBy, initialMinPrice, initialMaxPrice]);

  const handleApply = useCallback(
    () => onApply(sortBy, minPrice, maxPrice),
    [onApply, sortBy, minPrice, maxPrice],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrele & Sırala</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.filterLabel}>Sıralama</Text>
            <View style={styles.sortOptions}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortButton, sortBy === opt.value && styles.sortButtonActive]}
                  onPress={() => setSortBy(opt.value)}
                >
                  <Text style={[styles.sortButtonText, sortBy === opt.value && styles.sortButtonTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Fiyat Aralığı (₺)</Text>
            <View style={styles.priceInputs}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <Text style={styles.priceSeparator}>-</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearFilterButton} onPress={onClear}>
              <Text style={styles.clearFilterText}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFilterButton} onPress={handleApply}>
              <Text style={styles.applyFilterText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const UserHomeScreen = ({ navigation }: { navigation: Navigation }) => {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeMinPrice, setActiveMinPrice] = useState('');
  const [activeMaxPrice, setActiveMaxPrice] = useState('');
  const [activeSortBy, setActiveSortBy] = useState<SortBy>('newest');

  const hasMounted = useRef(false);

  // --- Data fetchers ---

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { sort: activeSortBy };
      if (searchQuery.trim()) params.search = searchQuery;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (activeMinPrice.trim()) params.minPrice = activeMinPrice;
      if (activeMaxPrice.trim()) params.maxPrice = activeMaxPrice;
      setListings(await api.getListings(params));
    } catch {
      // fail silently — empty list is shown via ListEmptyComponent
    } finally {
      setLoading(false);
    }
  }, [activeSortBy, searchQuery, selectedCategory, activeMinPrice, activeMaxPrice]);

  // Load categories and favorites once on mount
  useEffect(() => {
    let active = true;
    Promise.all([
      api.getCategories(),
      token ? api.getFavorites() : Promise.resolve([]),
    ]).then(([catsResponse, favsResponse]) => {
      if (!active) return;
      setCategories(catsResponse?.categories ?? catsResponse ?? []);
      const favArray = Array.isArray(favsResponse) ? favsResponse : [];
      setFavoriteIds(new Set(favArray.map((p: any) => String(p.id))));
    }).catch(() => {});
    return () => { active = false; };
  }, [token]);

  // Debounced fetch when filters/search change
  useEffect(() => {
    const id = setTimeout(fetchListings, 500);
    return () => clearTimeout(id);
  }, [fetchListings]);

  // On re-focus: skip first mount (initial fetch handled above), refresh on return
  useFocusEffect(
    useCallback(() => {
      if (!hasMounted.current) {
        hasMounted.current = true;
        return;
      }
      fetchListings();
      if (token) {
        api.getUnreadNotificationCount()
          .then((r) => setUnreadNotifCount(r.unreadCount))
          .catch(() => {});
      }
    }, [fetchListings, token]),
  );

  // --- Handlers ---

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!token) {
      Alert.alert('Uyarı', 'Favori eklemek için giriş yapmalısınız');
      return;
    }
    const isFav = favoriteIds.has(productId);

    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(productId) : next.add(productId);
      return next;
    });

    try {
      await (isFav ? api.removeFavorite(productId) : api.addFavorite(productId));
    } catch (error: any) {
      // Rollback
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFav ? next.add(productId) : next.delete(productId);
        return next;
      });
      Alert.alert('Hata', error?.message ?? 'Favori işlemi başarısız');
    }
  }, [favoriteIds, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const tasks: Promise<void>[] = [fetchListings()];
      if (token) {
        tasks.push(
          api.getFavorites()
            .then((favs: any) => {
              const arr = Array.isArray(favs) ? favs : (favs?.favorites ?? []);
              setFavoriteIds(new Set(arr.map((p: any) => String(p.id))));
            })
            .catch(() => {}),
        );
      }
      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  }, [fetchListings, token]);

  const applyFilters = useCallback((sortBy: SortBy, minPrice: string, maxPrice: string) => {
    setActiveSortBy(sortBy);
    setActiveMinPrice(minPrice);
    setActiveMaxPrice(maxPrice);
    setFilterModalVisible(false);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveSortBy('newest');
    setActiveMinPrice('');
    setActiveMaxPrice('');
    setFilterModalVisible(false);
  }, []);

  const handleNavigate = useCallback(
    (id: string) => navigation.navigate('ProductDetail', { productId: id }),
    [navigation],
  );

  const handleNotificationsPress = useCallback(() => {
    setUnreadNotifCount(0);
    navigation.navigate('Notifications');
  }, [navigation]);

  // --- Render ---

  const renderListing = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingCard
        item={item}
        isFavorite={favoriteIds.has(String(item.id))}
        onPress={handleNavigate}
        onFavoriteToggle={toggleFavorite}
      />
    ),
    [favoriteIds, handleNavigate, toggleFavorite],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View>
          <Text style={styles.greeting}>Hoş geldin,</Text>
          <Text style={styles.userName}>{user?.fullName ?? 'Misafir'}</Text>
        </View>
        <View style={styles.headerButtons}>
          {user?.role === 'ADMIN' && (
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={styles.headerButtonIcon}>🛡️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={handleNotificationsPress}>
            <Text style={styles.headerButtonIcon}>🔔</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Offers')}>
            <Text style={styles.headerButtonIcon}>🏷️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Chats')}>
            <Text style={styles.headerButtonIcon}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('UserProfile')}>
            <Text style={styles.headerButtonIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün, kategori veya marka ara..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Category Chips */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryText, selectedCategory === null && styles.categoryTextActive]}>Tümü</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.name.split(' - ')[1] ?? cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product List */}
      {loading && listings.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          initialNumToRender={6}
          windowSize={10}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Aradığınız kriterlere uygun ürün bulunamadı.</Text>
            </View>
          }
        />
      )}

      <FilterModal
        visible={isFilterModalVisible}
        initialSortBy={activeSortBy}
        initialMinPrice={activeMinPrice}
        initialMaxPrice={activeMaxPrice}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={() => setFilterModalVisible(false)}
      />

      <TouchableOpacity style={styles.floatingAddButton} onPress={() => navigation.navigate('AddProduct')}>
        <Text style={styles.floatingAddButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  greeting: { fontSize: 12, color: '#666' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  headerButton: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 20 },
  headerButtonIcon: { fontSize: 18 },
  notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', lineHeight: 12 },
  searchBarContainer: { flexDirection: 'row', padding: 10, gap: 10, backgroundColor: '#fff' },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchIcon: { marginRight: 8, color: '#999' },
  searchInput: { flex: 1, color: '#333' },
  filterButton: { width: 40, height: 40, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterIcon: { fontSize: 20 },
  categoriesContainer: { backgroundColor: '#fff', paddingBottom: 10 },
  categoriesList: { paddingHorizontal: 10, gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: 'transparent' },
  categoryChipActive: { backgroundColor: '#E3F2FD', borderColor: '#007AFF' },
  categoryText: { fontSize: 13, color: '#666', fontWeight: '500' },
  categoryTextActive: { color: '#007AFF', fontWeight: '700' },
  row: { justifyContent: 'space-between', paddingHorizontal: 10, marginVertical: 5 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 8, marginHorizontal: 5, marginVertical: 5, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  image: { width: '100%', height: 150, backgroundColor: '#e0e0e0' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 40 },
  placeholderText: { color: '#999', fontSize: 12 },
  cardContent: { padding: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333', marginRight: 5 },
  favoriteButton: { padding: 2 },
  heartIcon: { fontSize: 18 },
  heartIconActive: { transform: [{ scale: 1.1 }] },
  price: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginVertical: 4 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  seller: { fontSize: 11, color: '#666' },
  premiumBadge: { fontSize: 10, marginLeft: 4 },
  category: { fontSize: 10, color: '#999', marginTop: 4 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { color: '#999', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalClose: { fontSize: 24, color: '#666' },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 10 },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sortButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee' },
  sortButtonActive: { backgroundColor: '#E3F2FD', borderColor: '#007AFF' },
  sortButtonText: { fontSize: 13, color: '#666' },
  sortButtonTextActive: { color: '#007AFF', fontWeight: '600' },
  priceInputs: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: { flex: 1, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  priceSeparator: { fontSize: 20, color: '#666' },
  modalFooter: { flexDirection: 'row', marginTop: 30, gap: 15 },
  clearFilterButton: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center' },
  clearFilterText: { color: '#333', fontWeight: '600' },
  applyFilterButton: { flex: 2, padding: 15, borderRadius: 10, backgroundColor: '#007AFF', alignItems: 'center' },
  applyFilterText: { color: '#fff', fontWeight: 'bold' },
  floatingAddButton: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, zIndex: 999 },
  floatingAddButtonText: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },
});

export default UserHomeScreen;
