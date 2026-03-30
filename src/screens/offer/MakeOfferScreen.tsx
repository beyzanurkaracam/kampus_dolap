import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';

// 👑 MİMARİ KURAL: Axios SİLİNDİ, api.ts import edildi
import api from '../../services/api';

// 👑 SENIOR DOKUNUŞU: Resim linklerini güvenli hale getiren yardımcı fonksiyon
const getImageUrl = (url?: string) => {
  if (!url) return undefined;
  let finalUrl = url.trim();

  if (Platform.OS === 'android') {
    if (finalUrl.includes('localhost')) finalUrl = finalUrl.replace('localhost', '10.0.2.2');
    else if (finalUrl.includes('127.0.0.1')) finalUrl = finalUrl.replace('127.0.0.1', '10.0.2.2');
  }

  if (finalUrl.startsWith('http')) return finalUrl;
  
  const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  const cleanPath = finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl;
  return `${API_URL}/${cleanPath}`;
};

export const MakeOfferScreen = ({ route, navigation }: any) => {
  const { product } = route.params; 
  // Token'ı artık useAuth'tan çekmemize gerek yok, api.ts arka planda hallediyor.
  
  const [offerAmount, setOfferAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Hazır yüzdelik teklif butonları (Harika UX)
  const quickOffers = [
    { label: '%10 İndirim', value: Math.floor(product.price * 0.9) },
    { label: '%20 İndirim', value: Math.floor(product.price * 0.8) },
    { label: '%30 İndirim', value: Math.floor(product.price * 0.7) },
  ];

  const handleSendOffer = async () => {
    if (!offerAmount) {
      Alert.alert('Hata', 'Lütfen bir teklif tutarı giriniz.');
      return;
    }

    // 👑 SENIOR DEFANSI: Virgülü noktaya çevir ki parseFloat hata yapmasın
    const safeAmountString = offerAmount.replace(',', '.');
    const amount = parseFloat(safeAmountString);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
      return;
    }

    if (amount > product.price) {
        Alert.alert('Uyarı', 'Ürün fiyatından daha yüksek bir teklif vermek üzeresiniz.', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Devam Et', onPress: () => submitOffer(amount) }
        ]);
        return;
    }

    submitOffer(amount);
  };

  const submitOffer = async (amount: number) => {
    setLoading(true);
    try {
      // 👑 MİMARİ KURAL: api.ts üzerinden güvenli istek atıyoruz
      await api.createOffer({
        productId: product.id,
        amount: amount
      });

      Alert.alert(
        'Başarılı! 🎉',
        'Teklifiniz satıcıya iletildi. Sohbet ekranından takip edebilirsiniz.',
        [
          { 
            text: 'Tamam', 
            onPress: () => {
                // Sadece geri gitmek yerine Sohbetler sekmesine yönlendirmek daha iyi bir akış olabilir
                navigation.navigate('Chats'); 
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Teklif gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header Kapat Butonu */}
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Teklif Ver</Text>

        {/* Ürün Özeti Kartı */}
        <View style={styles.productCard}>
            <Image 
                source={{ uri: getImageUrl(product.images?.[0]?.imageUrl) || 'https://via.placeholder.com/150' }} 
                style={styles.productImage} 
            />
            <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                <Text style={styles.productPrice}>Liste Fiyatı: ₺{product.price}</Text>
                <Text style={styles.sellerName}>Satıcı: {product.seller?.fullName}</Text>
            </View>
        </View>

        {/* Teklif Giriş Alanı */}
        <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₺</Text>
            <TextInput
                style={styles.input}
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#ccc"
                autoFocus
            />
        </View>
        <Text style={styles.helperText}>Satıcıya teklifiniz iletilecektir.</Text>

        {/* Hızlı Teklif Butonları */}
        <View style={styles.quickOfferContainer}>
            {quickOffers.map((opt, index) => (
                <TouchableOpacity 
                    key={index} 
                    style={styles.quickOfferButton}
                    onPress={() => setOfferAmount(opt.value.toString())}
                    activeOpacity={0.7}
                >
                    <Text style={styles.quickOfferText}>{opt.label}</Text>
                    <Text style={styles.quickOfferValue}>₺{opt.value}</Text>
                </TouchableOpacity>
            ))}
        </View>

      </ScrollView>

      {/* Alt Buton */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.sendButton, loading && styles.disabledButton]} 
            onPress={handleSendOffer}
            disabled={loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.sendButtonText}>Teklifi Gönder</Text>
            )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// Tasarım kodların gayet iyiydi, sadece ufak renk rötuşları yapıldı.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, alignItems: 'center' },
  closeButton: { alignSelf: 'flex-end', padding: 10 },
  closeButtonText: { fontSize: 24, color: '#333', fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  productCard: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 12, width: '100%', alignItems: 'center', marginBottom: 30 },
  productImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#E5E5EA' },
  productInfo: { marginLeft: 15, flex: 1 },
  productTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  productPrice: { fontSize: 14, color: '#007AFF', marginTop: 4, fontWeight: '500' },
  sellerName: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#007AFF', paddingBottom: 5, marginBottom: 10, width: '60%', justifyContent: 'center' },
  currencySymbol: { fontSize: 32, fontWeight: 'bold', color: '#333', marginRight: 5 },
  input: { fontSize: 40, fontWeight: 'bold', color: '#333', minWidth: 50, textAlign: 'center' },
  helperText: { color: '#8E8E93', marginBottom: 30, fontSize: 13 },
  quickOfferContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  quickOfferButton: { backgroundColor: '#F0F8FF', padding: 12, borderRadius: 10, alignItems: 'center', flex: 1, marginHorizontal: 4, borderWidth: 1, borderColor: '#D1E8FF' },
  quickOfferText: { fontSize: 12, color: '#007AFF', marginBottom: 4, fontWeight: '500' },
  quickOfferValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F2F2F7', backgroundColor: '#fff' },
  sendButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  disabledButton: { opacity: 0.6 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});