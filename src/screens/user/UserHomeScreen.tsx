import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { Listing } from '../../types/listing.types';
// 👑 Mimari Kural: Tüm istekler sadece api.ts üzerinden!
import api from '../../services/api';

interface Category {
  id: number;
  name: string;
}

const UserHomeScreen = ({ navigation }: any) => {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  // --- Data States ---
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // --- UI States ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // --- Search & Category States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // --- Active Filters (API için kullanılır) ---
  const [activeMinPrice, setActiveMinPrice] = useState('');
  const [activeMaxPrice, setActiveMaxPrice] = useState('');
  const [activeSortBy, setActiveSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // --- Temp Filters (Modal içi kullanım) ---
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [tempSortBy, setTempSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // İlk açılışta kategorileri ve favorileri çek
  useEffect(() => {
    let isMounted = true; // Memory Leak koruması

    const loadInitialData = async () => {
      try {
        // 👑 SENIOR DOKUNUŞU: 'any' diyerek tip çatışmasını (never hatasını) önlüyoruz
        const [catsResponse, favsResponse] = await Promise.all<any>([
          api.getCategories(),
          token ? api.getFavorites() : Promise.resolve([])
        ]);

        if (isMounted) {
          setCategories(catsResponse?.categories || catsResponse || []);
          // Güvenli özellik (property) okuması için '?.' (Optional Chaining) kullanıyoruz
          const favArray = Array.isArray(favsResponse) ? favsResponse : (favsResponse?.favorites || []);
          setFavoriteIds(new Set(favArray.map((p: any) => p.id?.toString())));
        }
      } catch (error) {
        console.error('Başlangıç verileri yüklenemedi:', error);
      }
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, [token]);

  // 👑 SENIOR DOKUNUŞU: Debounced Search ve Listing Fetch
  useEffect(() => {
    let isMounted = true;

    const fetchListings = async () => {
      setLoading(true);
      try {
        const params: any = { sort: activeSortBy };

        if (searchQuery.trim()) params.search = searchQuery;
        if (selectedCategory) params.categoryId = selectedCategory;
        if (activeMinPrice.trim()) params.minPrice = activeMinPrice;
        if (activeMaxPrice.trim()) params.maxPrice = activeMaxPrice;

        const response = await api.getListings(params);
        if (isMounted) setListings(response);
      } catch (error) {
        console.error('Ürünler yüklenemedi:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Arama yazarken her harfte API'ye gitmemesi için 500ms gecikme (Debounce)
    const timeoutId = setTimeout(() => {
      fetchListings();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [selectedCategory, searchQuery, activeMinPrice, activeMaxPrice, activeSortBy]);


  const toggleFavorite = async (productId: string) => {
    if (!token) {
      Alert.alert('Uyarı', 'Favori eklemek için giriş yapmalısınız');
      return;
    }

    const isFavorite = favoriteIds.has(productId);
    
    // Optimistic UI Update: Kullanıcı beklememesi için arayüzü anında güncelliyoruz
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      isFavorite ? newSet.delete(productId) : newSet.add(productId);
      return newSet;
    });

    try {
      if (isFavorite) {
        await api.removeFavorite(productId);
      } else {
        await api.addFavorite(productId);
      }
    } catch (error: any) {
      // Hata olursa UI'ı eski haline çevir (Rollback)
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        isFavorite ? newSet.add(productId) : newSet.delete(productId);
        return newSet;
      });
      Alert.alert('Hata', error.message || 'Favori işlemi başarısız');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // State değişimi triggerlayarak fetchListings useEffect'ini tetikleriz
    setActiveSortBy(prev => prev); 
    
    if (token) {
      try {
        // 'any' ile okumaya zorluyoruz
        const favs: any = await api.getFavorites();
        const favArray = Array.isArray(favs) ? favs : (favs?.favorites || []);
        setFavoriteIds(new Set(favArray.map((p: any) => p.id?.toString())));
      } catch (e) {
        console.error('Refresh favori hatası', e);
      }
    }
    setRefreshing(false);
  }, [token]);

  // --- Modal Logic ---
  const openFilterModal = () => {
    setTempMinPrice(activeMinPrice);
    setTempMaxPrice(activeMaxPrice);
    setTempSortBy(activeSortBy);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setActiveMinPrice(tempMinPrice);
    setActiveMaxPrice(tempMaxPrice);
    setActiveSortBy(tempSortBy);
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempSortBy('newest');
    setActiveMinPrice('');
    setActiveMaxPrice('');
    setActiveSortBy('newest');
    setFilterModalVisible(false);
  };

  // 👑 Performans için render Item Memoize edildi
  const renderListing = useCallback(({ item }: { item: Listing }) => {
    const isFavorite = favoriteIds.has(item.id.toString());
    const primaryImage = item.images && item.images.length > 0 ? item.images[0].imageUrl : null;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        {primaryImage ? (
          <Image
            source={{ uri: primaryImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderIcon}>📦</Text>
            <Text style={styles.placeholderText}>Resim Yok</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id.toString());
              }}
            >
              <Text style={[styles.heartIcon, isFavorite && styles.heartIconActive]}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.price}>₺{item.price.toLocaleString('tr-TR')}</Text>
          <View style={styles.sellerRow}>
             <Text style={styles.seller}>{item.seller?.fullName || 'Bilinmeyen'}</Text>
             {(item.seller as any)?.isPremium && <Text style={styles.premiumBadge}>⭐</Text>}
          </View>
          <Text style={styles.category}>{item.category?.name || 'Diğer'}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [favoriteIds, navigation]);

  return (
    <View style={styles.container}>
      {/* 1. Header Section */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View>
          <Text style={styles.greeting}>Hoş geldin,</Text>
          <Text style={styles.userName}>{user?.fullName || 'Misafir'}</Text>
        </View>
        <View style={styles.headerButtons}>
          {user?.role === 'ADMIN' && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('AdminDashboard')}
            >
              <Text style={styles.headerButtonIcon}>🛡️</Text>
            </TouchableOpacity>
          )}
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

      {/* 2. Search & Filter Bar */}
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
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Category Chips */}
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
                {cat.name.split(' - ')[1] || cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 4. Product List */}
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
          initialNumToRender={6} // Performans: İlk başta sadece 6 kart çiz
          windowSize={10} // Performans: Hafızada kaç ekranlık liste tutulacağı
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Aradığınız kriterlere uygun ürün bulunamadı.</Text>
            </View>
          }
        />
      )}

      {/* 5. Filter Modal */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele & Sırala</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Sıralama</Text>
              <View style={styles.sortOptions}>
                <TouchableOpacity style={[styles.sortButton, tempSortBy === 'newest' && styles.sortButtonActive]} onPress={() => setTempSortBy('newest')}>
                  <Text style={[styles.sortButtonText, tempSortBy === 'newest' && styles.sortButtonTextActive]}>En Yeni</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sortButton, tempSortBy === 'price_asc' && styles.sortButtonActive]} onPress={() => setTempSortBy('price_asc')}>
                  <Text style={[styles.sortButtonText, tempSortBy === 'price_asc' && styles.sortButtonTextActive]}>Fiyat (Artan)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sortButton, tempSortBy === 'price_desc' && styles.sortButtonActive]} onPress={() => setTempSortBy('price_desc')}>
                  <Text style={[styles.sortButtonText, tempSortBy === 'price_desc' && styles.sortButtonTextActive]}>Fiyat (Azalan)</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.filterLabel}>Fiyat Aralığı (₺)</Text>
              <View style={styles.priceInputs}>
                <TextInput style={styles.priceInput} placeholder="Min" keyboardType="numeric" value={tempMinPrice} onChangeText={setTempMinPrice} />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput style={styles.priceInput} placeholder="Max" keyboardType="numeric" value={tempMaxPrice} onChangeText={setTempMaxPrice} />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearFilterButton} onPress={clearFilters}>
                <Text style={styles.clearFilterText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFilterButton} onPress={applyFilters}>
                <Text style={styles.applyFilterText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.floatingAddButton} onPress={() => navigation.navigate('AddProduct')}>
        <Text style={styles.floatingAddButtonText}>+</Text>
      </TouchableOpacity>

    </View>
  );
};

// Styles aynı kaldı (zaten gayet şıktı)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  greeting: { fontSize: 12, color: '#666' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  headerButton: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 20 },
  headerButtonIcon: { fontSize: 18 },
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