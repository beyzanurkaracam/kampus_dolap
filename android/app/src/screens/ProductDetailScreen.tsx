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
  Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_URL = 'http://10.0.2.2:3000';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
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
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchProductDetail();
  }, [productId]);

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

  const handleDeleteProduct = () => {
    Alert.alert(
      'Ürünü Kaldır',
      'Bu ürünü kaldırmak istediğinize emin misiniz?',
      [
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
      ]
    );
  };

  const handleEditProduct = () => {
    navigation.navigate('EditProduct', { productId, product });
  };

  const handleMarkAsSold = async () => {
    try {
      await axios.patch(
        `${API_URL}/products/${productId}/status`,
        { status: 'sold' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Başarılı', 'Ürün satıldı olarak işaretlendi');
      fetchProductDetail();
    } catch (error) {
      Alert.alert('Hata', 'İşlem başarısız');
    }
  };

  const handleMakeOffer = () => {
    navigation.navigate('MakeOffer', { productId, sellerId: product?.seller.id });
  };

 /* const handleContactSeller = () => {
    if (product?.seller.phone) {
      Alert.alert(
        'Satıcıyla İletişim',
        `${product.seller.fullName}\n${product.seller.phone}`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Ara',
            onPress: () => Linking.openURL(`tel:${product.seller.phone}`),
          },
          {
            text: 'WhatsApp',
            onPress: () => Linking.openURL(`whatsapp://send?phone=90${product.seller.phone}`),
          },
        ]
      );
    } else {
      Alert.alert('Bilgi', 'Satıcının telefon numarası paylaşılmamış');
    }
  };
*/
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!product) return null;

  const getConditionText = (condition: string) => {
    const map: any = {
      new: 'Sıfır',
      like_new: 'Sıfır Gibi',
      good: 'İyi',
      fair: 'Orta',
    };
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
const handleContactSeller = async () => {
  try {
    // Sohbet başlat veya mevcut sohbeti aç
    const response = await axios.post(
      `${API_URL}/chats`,
      { 
        sellerId: product?.seller.id, 
        productId: product?.id 
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Sohbet ekranına git
    navigation.navigate('ChatDetail', { 
      chatId: response.data.id,
      otherUser: product?.seller,
      product: product,
    });
  } catch (error: any) {
    if (error.response?.data?.message) {
      Alert.alert('Hata', error.response.data.message);
    } else {
      Alert.alert('Hata', 'Sohbet başlatılamadı');
    }
  }
};

  return (
    <ScrollView style={styles.container}>
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
          {product.images.map((img, index) => (
            <Image
              key={img.id}
              source={{ uri: img.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        
        {/* Image Counter */}
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1} / {product.images.length}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          {getStatusBadge(product.status)}
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>₺{product.price.toLocaleString('tr-TR')}</Text>
        
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
            <View style={styles.sellerInfo}>
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
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isOwner ? (
          <>
            {/* Seller Actions */}
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
            {/* Buyer Actions */}
            {product.status === 'active' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleMakeOffer}
                >
                  <Text style={styles.actionButtonText}>💰 Teklif Ver</Text>
                </TouchableOpacity>

                <TouchableOpacity
    style={[styles.actionButton, styles.secondaryButton]}
    onPress={handleContactSeller}
  >
    <Text style={styles.actionButtonText}>💬 Satıcıyla Mesajlaş</Text>
  </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.outlineButton]}
                  onPress={handleAddToFavorites}
                >
                  <Text style={[styles.actionButtonText, styles.outlineButtonText]}>
                    ❤️ Favorilere Ekle
                  </Text>
                </TouchableOpacity>
              </>
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
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    height: 400,
    backgroundColor: '#000',
  },
  productImage: {
    width: width,
    height: 400,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  descriptionContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
  },
  sellerContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  sellerAvatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sellerEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actionsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#007AFF',
  },
  soldNotice: {
    backgroundColor: '#8E8E93',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  soldNoticeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
