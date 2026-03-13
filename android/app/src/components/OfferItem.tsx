import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Alert 
} from 'react-native';

interface OfferItemProps {
  offer: any;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCounter: (id: string, amount: number) => void; // ✅ Yeni Prop
  loadingId: string | null;
}

export const OfferItem: React.FC<OfferItemProps> = ({ 
  offer, 
  onAccept, 
  onReject, 
  onCounter, 
  loadingId 
}) => {
  const isPending = offer.status === 'pending';
  const productImg = offer.product?.images?.[0]?.imageUrl;

  // Karşı teklif modu için state
  const [isCounterMode, setIsCounterMode] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');

  // Duruma göre etiket rengi
  const getStatusColor = () => {
    switch (offer.status) {
      case 'accepted': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'countered': return '#8E8E93'; // Gri (Arşivlenmiş)
      default: return '#FF9500';
    }
  };

  const getStatusText = () => {
    switch (offer.status) {
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      case 'countered': return 'Karşı Teklif Verildi';
      default: return 'Cevap Bekliyor';
    }
  };

  const handleSendCounter = () => {
    const amount = parseFloat(counterPrice);
    if (!amount || amount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar giriniz');
      return;
    }
    // API'ye gönder
    onCounter(offer.id, amount);
    // Modu kapat
    setIsCounterMode(false);
    setCounterPrice('');
  };

  return (
    <View style={styles.card}>
      {/* Üst Kısım: Ürün ve Fiyat */}
      <View style={styles.header}>
        <Image 
          source={{ uri: productImg || 'https://via.placeholder.com/100' }} 
          style={styles.image} 
        />
        <View style={styles.info}>
          <Text style={styles.productTitle} numberOfLines={1}>{offer.product.title}</Text>
          <Text style={styles.buyerName}>
             {/* Teklifi kimin yaptığını gösterir */}
             {offer.makerId === offer.buyer.id ? 'Alıcı Teklifi' : 'Satıcı Teklifi'}: {offer.buyer.fullName}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.offerPrice}>₺{offer.offerAmount}</Text>
            <Text style={[styles.statusBadge, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </View>

      {/* Alt Kısım: Aksiyonlar (Sadece Pending ise) */}
      {isPending && (
        <View style={styles.actionContainer}>
          {/* A) KARŞI TEKLİF MODU (Input Açık) */}
          {isCounterMode ? (
            <View style={styles.counterRow}>
               <TextInput 
                  style={styles.input}
                  placeholder="Yeni Tutar"
                  keyboardType="numeric"
                  value={counterPrice}
                  onChangeText={setCounterPrice}
                  autoFocus
               />
               <TouchableOpacity 
                 style={styles.sendButton} 
                 onPress={handleSendCounter}
                 disabled={!!loadingId}
               >
                 <Text style={styles.buttonText}>Gönder</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={styles.cancelButton} 
                 onPress={() => setIsCounterMode(false)}
               >
                 <Text style={styles.cancelText}>✕</Text>
               </TouchableOpacity>
            </View>
          ) : (
            /* B) NORMAL BUTONLAR */
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.rejectButton]} 
                onPress={() => onReject(offer.id)}
                disabled={!!loadingId}
              >
                {loadingId === `reject-${offer.id}` ? (
                   <ActivityIndicator color="#fff" size="small" />
                ) : (
                   <Text style={styles.buttonText}>Reddet</Text>
                )}
              </TouchableOpacity>

              {/* Karşı Teklif Butonu */}
              <TouchableOpacity 
                style={[styles.button, styles.counterButton]} 
                onPress={() => setIsCounterMode(true)}
                disabled={!!loadingId}
              >
                 {loadingId === `counter-${offer.id}` ? (
                   <ActivityIndicator color="#333" size="small" />
                ) : (
                   <Text style={[styles.buttonText, { color: '#333' }]}>Karşı Teklif</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.acceptButton]} 
                onPress={() => onAccept(offer.id)}
                disabled={!!loadingId}
              >
                 {loadingId === `accept-${offer.id}` ? (
                   <ActivityIndicator color="#fff" size="small" />
                ) : (
                   <Text style={styles.buttonText}>Kabul Et</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF', 
  },
  header: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  buyerName: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: { backgroundColor: '#34C759' },
  rejectButton: { backgroundColor: '#FF3B30' },
  counterButton: { backgroundColor: '#FFD60A' }, // Sarı
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  // Counter Modu Stilleri
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
});