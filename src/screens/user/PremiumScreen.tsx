import React, { memo, useCallback, useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { AppConfig } from '../../config/env';

// ─── Types ───────────────────────────────────────────────────────────────────

type RootStackParamList = { Premium: undefined };
type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;

// ─── Constants ───────────────────────────────────────────────────────────────

// Merkezi config (src/config/env.ts) → react-native-config üzerinden ortam değişkeni.
const API_BASE = AppConfig.API_URL;

const MONTHLY_PRODUCT = {
  productId: 'com.dolapkampus.premium.monthly',
  price: '29.99',
} as const;

const FEATURES = [
  { icon: '🚀', title: 'Öne Çıkan İlanlar', desc: 'İlanların vitrinde en üst sıralarda yer alsın.' },
  { icon: '📸', title: 'Daha Fazla Fotoğraf', desc: 'Ürünlerin için 15 fotoğraf yükleme hakkı.' },
  { icon: '💬', title: 'Sınırsız Mesajlaşma', desc: 'Günlük mesaj kotasına takılma.' },
] as const;

// ─── FeatureItem ─────────────────────────────────────────────────────────────

interface FeatureItemProps {
  icon: string;
  title: string;
  desc: string;
}

const FeatureItem = memo(({ icon, title, desc }: FeatureItemProps) => (
  <View style={styles.featureItem}>
    <View style={styles.iconContainer}>
      <Text style={styles.featureIcon}>{icon}</Text>
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
));

// ─── Hook ─────────────────────────────────────────────────────────────────────

function usePremiumPurchase(
  token: string | null | undefined,
  checkAuth: (() => Promise<void>) | undefined,
  onSuccess: () => void,
) {
  const [loading, setLoading] = useState(false);

  const purchase = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          platform: Platform.OS,
          productId: MONTHLY_PRODUCT.productId,
          receipt: 'MOCK_RECEIPT_SIM',
        }),
      });

      if (!response.ok) throw new Error('Ödeme doğrulanamadı');

      Alert.alert('Tebrikler!', 'Premium üyeliğiniz başarıyla aktif edildi!', [
        {
          text: 'Süper!',
          onPress: async () => {
            await checkAuth?.();
            onSuccess();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error?.message ?? 'Ödeme simülasyonu sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [token, checkAuth, onSuccess]);

  return { loading, purchase };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export const PremiumScreen = ({ navigation }: Props) => {
  const { token, checkAuth } = useAuth();
  const handleSuccess = useCallback(() => navigation.goBack(), [navigation]);
  const { loading, purchase } = usePremiumPurchase(token, checkAuth, handleSuccess);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.crownIcon}>👑</Text>
        <Text style={styles.headerTitle}>Dolap Kampüs Premium</Text>
        <Text style={styles.headerSubtitle}>Sınırları kaldır, daha hızlı sat!</Text>
      </View>

      <View style={styles.featuresContainer}>
        {FEATURES.map((f) => (
          <FeatureItem key={f.title} {...f} />
        ))}
      </View>

      <View style={styles.pricingContainer}>
        <View style={styles.priceCard}>
          <View style={styles.tagContainer}>
            <Text style={styles.tagText}>EN POPÜLER</Text>
          </View>
          <Text style={styles.period}>Aylık Üyelik</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>₺</Text>
            <Text style={styles.amount}>{MONTHLY_PRODUCT.price}</Text>
          </View>
          <Text style={styles.cancelAnytime}>İstediğin zaman iptal et</Text>

          <TouchableOpacity
            style={styles.buyButton}
            onPress={purchase}
            disabled={loading}
            accessibilityLabel="Premium'a geç"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buyButtonText}>Premium'a Geç</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.legalText}>
        Ödeme {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} üzerinden alınır.
      </Text>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  crownIcon: { fontSize: 50, marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: '#e0e0e0', opacity: 0.8 },
  featuresContainer: { padding: 20, marginTop: 10 },
  featureItem: { flexDirection: 'row', marginBottom: 25, alignItems: 'center' },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF9C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureIcon: { fontSize: 24 },
  textContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  featureDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
  pricingContainer: { padding: 20, alignItems: 'center' },
  priceCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
  },
  tagContainer: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  period: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 15 },
  currency: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 5 },
  amount: { fontSize: 48, fontWeight: 'bold', color: '#333' },
  cancelAnytime: { fontSize: 12, color: '#999', marginBottom: 20 },
  buyButton: {
    backgroundColor: '#FFD700',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  legalText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
});
