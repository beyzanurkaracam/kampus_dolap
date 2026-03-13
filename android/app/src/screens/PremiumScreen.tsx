import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// 🚨 DİKKAT: RNIap kütüphanesi kaldırıldığı için tüm mağaza işlemleri SİMÜLE edilmektedir.

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const PremiumScreen = ({ navigation }: any) => {
  const { token, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // 🛠️ SİMÜLASYON: Sanki mağazadan ürün çekmişiz gibi davranıyoruz
    const loadMockProducts = () => {
      setProducts([
        {
          productId: 'com.dolapkampus.premium.monthly',
          price: '29.99', // Mock fiyat
          title: 'Aylık Premium Üyelik',
        }
      ]);
    };

    loadMockProducts();
  }, []);

  // Backend Doğrulama Fonksiyonu (Hala gerçek çalışır, backend'e istek atar)
  const verifyPurchaseBackend = async (receipt: string, productId: string) => {
    try {
      console.log('🔄 Backend doğrulama (Simülasyon)...');
      
      // Backend'e sahte makbuz gönderiyoruz
      await axios.post(
        `${API_URL}/payment/verify`,
        {
          platform: Platform.OS,
          productId: productId,
          receipt: receipt,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'Tebrikler! 🎉',
        'Premium üyeliğiniz başarıyla aktif edildi! (Test Modu)',
        [{ 
            text: 'Süper!', 
            onPress: async () => {
                if(checkAuth) await checkAuth(); // Token'ı yenile
                navigation.goBack();
            } 
        }]
      );
    } catch (error: any) {
      console.error('❌ Backend Verify Error:', error);
      Alert.alert('Hata', 'Ödeme simülasyonu sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Satın Alma Butonu (IAP Kütüphanesi olmadan)
  const handlePurchase = async () => {
    setLoading(true);
    
    // 🛠️ Gerçek mağaza yerine doğrudan simülasyonu başlatıyoruz
    console.log("⚠️ IAP Kütüphanesi Yok: Doğrudan backend onayı deneniyor...");
    
    // Gerçekçilik için 1.5 saniye bekle
    setTimeout(async () => {
        await verifyPurchaseBackend('MOCK_RECEIPT_WITHOUT_LIB', 'com.dolapkampus.premium.monthly');
    }, 1500);
  };

  const FeatureItem = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
    <View style={styles.featureItem}>
      <View style={styles.iconContainer}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
       <View style={styles.header}>
        <Text style={styles.crownIcon}>👑</Text>
        <Text style={styles.headerTitle}>Dolap Kampüs Premium</Text>
        <Text style={styles.headerSubtitle}>Sınırları kaldır, daha hızlı sat!</Text>
      </View>

      <View style={styles.featuresContainer}>
        <FeatureItem icon="🚀" title="Öne Çıkan İlanlar" desc="İlanların vitrinde en üst sıralarda yer alsın." />
        <FeatureItem icon="📸" title="Daha Fazla Fotoğraf" desc="Ürünlerin için 15 fotoğraf yükleme hakkı." />
        <FeatureItem icon="💬" title="Sınırsız Mesajlaşma" desc="Günlük mesaj kotasına takılma." />
      </View>

      <View style={styles.pricingContainer}>
        <View style={styles.priceCard}>
          <View style={styles.tagContainer}>
            <Text style={styles.tagText}>EN POPÜLER</Text>
          </View>
          <Text style={styles.period}>Aylık Üyelik</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>₺</Text>
            <Text style={styles.amount}>
                {products.length > 0 ? products[0].price : '...'}
            </Text>
          </View>
          <Text style={styles.cancelAnytime}>İstediğin zaman iptal et</Text>
          
          <TouchableOpacity 
            style={styles.buyButton} 
            onPress={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buyButtonText}>Premium'a Geç (Test)</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.legalText}>
        Ödeme {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} üzerinden alınır.
        (Şu an Kütüphanesiz Test Modu Aktif)
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#1a1a1a', paddingVertical: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  crownIcon: { fontSize: 50, marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: '#e0e0e0', opacity: 0.8 },
  featuresContainer: { padding: 20, marginTop: 10 },
  featureItem: { flexDirection: 'row', marginBottom: 25, alignItems: 'center' },
  iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF9C4', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureIcon: { fontSize: 24 },
  textContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  featureDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
  pricingContainer: { padding: 20, alignItems: 'center' },
  priceCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 2, borderColor: '#FFD700', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, position: 'relative' },
  tagContainer: { position: 'absolute', top: -12, backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  period: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 15 },
  currency: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 5 },
  amount: { fontSize: 48, fontWeight: 'bold', color: '#333' },
  cancelAnytime: { fontSize: 12, color: '#999', marginBottom: 20 },
  buyButton: { backgroundColor: '#FFD700', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buyButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  legalText: { fontSize: 11, color: '#999', textAlign: 'center', marginBottom: 30, paddingHorizontal: 40 },
});