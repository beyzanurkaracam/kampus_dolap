import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { CommentsSection } from '../../components/CommentsSection';


const { width } = Dimensions.get('window');
const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  acceptedOfferPrice?: number;
  condition: string;
  size: string;
  brand: string;
  color: string;
  status: string;
  createdAt: string;
  images: Array<{ id: string; imageUrl: string }>;
  category: { id: string; name: string };
  seller: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    profilePhoto?: string;
  };
}

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params;
  const { token, userId } = useAuth();
  
  // State'ler
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]); // 👈 YENİ: Benzer Ürünler State'i
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchProductDetail();
    fetchSimilarProducts(); // 👈 YENİ: Benzer ürünleri çek
  }, [productId]); // productId değişirse (benzer ürüne tıklanırsa) sayfa yenilenir

  const fetchProductDetail = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setProduct(response.data);
      setIsOwner(response.data.seller.id === userId);
    } catch (error) {
      console.error('Ürün detayı yüklenirken hata:', error);
      Alert.alert('Hata', 'Ürün bilgileri yüklenemedi');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // 🔎 YENİ: Benzer Ürünleri Çeken Fonksiyon
  const fetchSimilarProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/${productId}/similar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSimilarProducts(response.data);
    } catch (error) {
      console.log('Benzer ürünler alınamadı', error);
      // Hata olsa bile ana akışı bozma, sadece boş kalsın
    }
  };

  const handleDeleteProduct = () => {
    Alert.alert('Ürünü Kaldır', 'Bu ürünü kaldırmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/products/${productId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            Alert.alert('Başarılı', 'Ürün kaldırıldı');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Hata', 'Ürün kaldırılamadı');
          }
        },
      },
    ]);
  };

  const handleEditProduct = () => {
    navigation.navigate('EditProduct', { productId, product });
  };

  const handleMarkAsSold = async () => {
    Alert.alert('Satıldı olarak işaretle', 'Onaylıyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Satıldı',
        onPress: async () => {
          try {
            await axios.patch(
              `${API_URL}/products/${productId}/sold`,
              {},
              { headers: { Authorization: `Bearer ${token}` } },
            );
            Alert.alert('Başarılı', 'Ürün satıldı olarak işaretlendi');
            fetchProductDetail();
          } catch (error) {
            Alert.alert('Hata', 'İşlem başarısız');
          }
        },
      },
    ]);
  };

  const handleMakeOffer = () => {
    navigation.navigate('MakeOffer', { product: product });
  };

  const handleAddToFavorites = async () => {
    try {
      await axios.post(
        `${API_URL}/products/${productId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Başarılı', 'Favorilere eklendi');
    } catch (error) {
      Alert.alert('Hata', 'Favorilere eklenemedi');
    }
  };

  // Altın Yol: Sohbet ancak teklif kabul edilince açılır.
  // Eski "Satıcıyla Mesajlaş" butonu kaldırıldı.

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!product) return null;

  const getConditionText = (condition: string) => {
    const map: any = { new: 'Sıfır', like_new: 'Sıfır Gibi', good: 'İyi', fair: 'Orta' };
    return map[condition] || condition;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      active: { text: 'Aktif', color: '#34C759' },
      pending: { text: 'Onay Bekliyor', color: '#FF9500' },
      sold: { text: 'Satıldı', color: '#8E8E93' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
        <Text style={styles.statusText}>{config.text}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Gallery */}
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
          }}
          scrollEventThrottle={16}
        >
          {product.images.map((img) => (
            <Image
              key={img.id}
              source={{ uri: img.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1} / {product.images.length}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          {getStatusBadge(product.status)}
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{product.title}</Text>
        {product.acceptedOfferPrice ? (
          <View style={styles.priceContainer}>
             <View>
                <Text style={styles.oldPriceLabel}>Liste Fiyatı</Text>
                <Text style={styles.oldPrice}>₺{product.price.toLocaleString('tr-TR')}</Text>
             </View>
             <View style={styles.acceptedPriceBadge}>
                <Text style={styles.acceptedPriceLabel}>Kabul Edilen Teklif 🎉</Text>
                <Text style={styles.acceptedPrice}>₺{product.acceptedOfferPrice.toLocaleString('tr-TR')}</Text>
             </View>
          </View>
        ) : (
          <Text style={styles.price}>₺{product.price.toLocaleString('tr-TR')}</Text>
        )}
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Kategori</Text>
            <Text style={styles.detailValue}>{product.category.name}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Durum</Text>
            <Text style={styles.detailValue}>{getConditionText(product.condition)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Marka</Text>
            <Text style={styles.detailValue}>{product.brand}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Beden</Text>
            <Text style={styles.detailValue}>{product.size}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Renk</Text>
            <Text style={styles.detailValue}>{product.color}</Text>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Açıklama</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Seller Info */}
        {!isOwner && (
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Satıcı Bilgileri</Text>
            
            <TouchableOpacity 
              style={styles.sellerInfo}
              onPress={() => navigation.navigate('UserProfile', { userId: product.seller.id })}
            >
              {product.seller.profilePhoto ? (
                <Image
                  source={{ uri: product.seller.profilePhoto }}
                  style={styles.sellerAvatar}
                />
              ) : (
                <View style={[styles.sellerAvatar, styles.sellerAvatarPlaceholder]}>
                  <Text style={styles.sellerAvatarText}>
                    {product.seller.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{product.seller.fullName}</Text>
                <Text style={styles.sellerEmail}>{product.seller.email}</Text>
                <Text style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>Profili Gör ›</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {}
      {similarProducts.length > 0 && (
        <View style={styles.similarContainer}>
            <Text style={styles.similarTitle}>Bunları da Beğenebilirsin</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
                {similarProducts.map((item: any) => (
                    <TouchableOpacity 
                        key={item.id} 
                        style={styles.similarCard}
                        onPress={() => navigation.push('ProductDetail', { productId: item.id })} // push kullanıyoruz
                    >
                        <Image 
                            source={{ uri: item.images?.[0]?.imageUrl || 'https://via.placeholder.com/150' }} 
                            style={styles.similarImage} 
                        />
                        <View style={styles.similarInfo}>
                            <Text numberOfLines={1} style={styles.similarCardTitle}>{item.title}</Text>
                            <Text style={styles.similarCardPrice}>₺{item.price}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      )}
      {/* Sorular & Yorumlar Bölümü */}
   <CommentsSection
     productId={product.id}
     sellerId={product.seller.id}
   />

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isOwner ? (
          <>
            {product.status === 'active' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.successButton]}
                onPress={handleMarkAsSold}
              >
                <Text style={styles.actionButtonText}>✓ Satıldı Olarak İşaretle</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleEditProduct}
            >
              <Text style={styles.actionButtonText}>✏️ Ürünü Düzenle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDeleteProduct}
            >
              <Text style={styles.actionButtonText}>🗑️ Ürünü Kaldır</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {product.status === 'active' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleMakeOffer}
                >
                  <Text style={styles.actionButtonText}>Teklif Ver / Satın Al</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.outlineButton]}
                  onPress={handleAddToFavorites}
                >
                  <Text style={[styles.actionButtonText, styles.outlineButtonText]}>
                    Favorilere Ekle
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {product.status === 'reserved' && (
              <View style={styles.soldNotice}>
                <Text style={styles.soldNoticeText}>Bu ürün rezerve edildi</Text>
              </View>
            )}

            {product.status === 'sold' && (
              <View style={styles.soldNotice}>
                <Text style={styles.soldNoticeText}>Bu ürün satılmıştır</Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { height: 400, backgroundColor: '#000' },
  productImage: { width: width, height: 400 },
  imageCounter: { position: 'absolute', bottom: 16, right: 16, backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  imageCounterText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  statusContainer: { position: 'absolute', top: 16, left: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  infoContainer: { backgroundColor: '#FFF', padding: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 8 },
  price: { fontSize: 28, fontWeight: '800', color: '#007AFF', marginBottom: 16 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#000' },
  descriptionContainer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 12 },
  description: { fontSize: 15, color: '#3C3C43', lineHeight: 22 },
  sellerContainer: { marginTop: 8 },
  sellerInfo: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  sellerAvatarPlaceholder: { width: 56, height: 56, borderRadius: 28, marginRight: 12, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  sellerAvatarText: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  sellerDetails: { flex: 1 },
  sellerName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  sellerEmail: { fontSize: 14, color: '#8E8E93' },
  actionsContainer: { padding: 16, paddingBottom: 32 },
  actionButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryButton: { backgroundColor: '#007AFF' },
  secondaryButton: { backgroundColor: '#34C759' },
  successButton: { backgroundColor: '#34C759' },
  dangerButton: { backgroundColor: '#FF3B30' },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#007AFF' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  outlineButtonText: { color: '#007AFF' },
  soldNotice: { backgroundColor: '#8E8E93', padding: 16, borderRadius: 12, alignItems: 'center' },
  soldNoticeText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  priceContainer: { marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  oldPriceLabel: { fontSize: 12, color: '#8E8E93', textDecorationLine: 'line-through' },
  oldPrice: { fontSize: 18, fontWeight: '600', color: '#8E8E93', textDecorationLine: 'line-through' },
  acceptedPriceBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4CAF50' },
  acceptedPriceLabel: { fontSize: 10, color: '#2E7D32', fontWeight: '700', marginBottom: 2 },
  acceptedPrice: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32' },

  similarContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  similarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  similarList: {
    paddingHorizontal: 16,
  },
  similarCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingBottom: 10,
  },
  similarImage: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  similarInfo: {
    padding: 8,
  },
  similarCardTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  similarCardPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});