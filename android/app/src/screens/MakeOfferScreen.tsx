// android/app/src/screens/MakeOfferScreen.tsx

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
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// API URL (Senin projendeki standart yapı)
const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

export const MakeOfferScreen = ({ route, navigation }: any) => {
  const { product } = route.params; // Ürün bilgilerini parametre olarak alacağız
  const { token } = useAuth();
  
  const [offerAmount, setOfferAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Hazır yüzdelik teklif butonları için (Opsiyonel ama şık durur)
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

    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
      return;
    }

    // Backend'de bu kontrol var ama burada da yapmak UX açısından iyidir
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
      // Backend'deki OfferController -> create metoduna istek atıyoruz
      await axios.post(
        `${API_URL}/offers`,
        {
          productId: product.id,
          amount: amount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'Başarılı! 🎉',
        'Teklifiniz satıcıya iletildi. Sohbet ekranından takip edebilirsiniz.',
        [
          { 
            text: 'Tamam', 
            onPress: () => {
                // Sohbetler ekranına veya ürün detayına geri dön
                navigation.navigate('Chats'); 
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Teklif hatası:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Teklif gönderilemedi.';
      Alert.alert('Hata', errorMessage);
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
                source={{ uri: product.images?.[0]?.imageUrl || 'https://via.placeholder.com/150' }} 
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  productInfo: {
    marginLeft: 15,
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sellerName: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingBottom: 5,
    marginBottom: 10,
    width: '60%',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  input: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 50,
    textAlign: 'center',
  },
  helperText: {
    color: '#999',
    marginBottom: 30,
  },
  quickOfferContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  quickOfferButton: {
    backgroundColor: '#F0F8FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#D1E8FF',
  },
  quickOfferText: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
  },
  quickOfferValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});