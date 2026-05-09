import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
} from 'react-native';

export interface OfferItemProps {
  offer: any;
  currentUserId: string;
  isSentOffer?: boolean;
  onAccept: (offerId: string) => void | Promise<void>;
  onReject: (offerId: string) => void | Promise<void>;
  onCounter: (offerId: string, amount: number) => void | Promise<void>;
  loadingId: string | null;
}

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

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: 'Bekliyor', color: '#FF9500', bg: '#FFF5E5' };
    case 'accepted':
      return { text: 'Kabul Edildi', color: '#34C759', bg: '#E8F8EE' };
    case 'rejected':
      return { text: 'Reddedildi', color: '#FF3B30', bg: '#FFEBEA' };
    case 'cancelled':
      return { text: 'İptal Edildi', color: '#8E8E93', bg: '#F2F2F7' };
    case 'countered':
      return { text: 'Karşı Teklif', color: '#5856D6', bg: '#EFEEFF' };
    default:
      return { text: status, color: '#8E8E93', bg: '#F2F2F7' };
  }
};

export const OfferItem = ({
  offer,
  isSentOffer = false,
  onAccept,
  onReject,
  onCounter,
  loadingId,
}: OfferItemProps) => {
  const [counterMode, setCounterMode] = useState(false);
  const [counterValue, setCounterValue] = useState('');

  const isAccepting = loadingId === `accept-${offer.id}`;
  const isRejecting = loadingId === `reject-${offer.id}`;
  const isCountering = loadingId === `counter-${offer.id}`;
  const isAnyLoading = isAccepting || isRejecting || isCountering;

  const status = getStatusDisplay(offer.status);
  const productImage = getImageUrl(offer.product?.images?.[0]?.imageUrl);

  const handleSubmitCounter = () => {
    const amount = parseFloat(counterValue.replace(',', '.'));
    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
      return;
    }
    onCounter(offer.id, amount);
    setCounterMode(false);
    setCounterValue('');
  };

  const showActions = offer.status === 'pending' && !isSentOffer;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.userName} numberOfLines={1}>
          {isSentOffer
            ? `Satıcı: ${offer.product?.seller?.fullName || '—'}`
            : `Gönderen: ${offer.buyer?.fullName || '—'}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {productImage ? (
          <Image source={{ uri: productImage }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text>📦</Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {offer.product?.title || 'Ürün Bilgisi Yok'}
          </Text>
          <Text style={styles.offerAmount}>
            Teklif: <Text style={styles.amountBold}>₺{offer.offerAmount}</Text>
          </Text>
        </View>
      </View>

      {showActions && !counterMode && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton, isAnyLoading && styles.disabledButton]}
            onPress={() => onReject(offer.id)}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            {isRejecting ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Text style={styles.rejectButtonText}>Reddet</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.counterButton, isAnyLoading && styles.disabledButton]}
            onPress={() => setCounterMode(true)}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.counterButtonText}>Karşı Teklif</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton, isAnyLoading && styles.disabledButton]}
            onPress={() => onAccept(offer.id)}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.acceptButtonText}>Kabul Et</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {counterMode && (
        <View style={styles.counterBox}>
          <TextInput
            style={styles.counterInput}
            value={counterValue}
            onChangeText={setCounterValue}
            keyboardType="numeric"
            placeholder="Yeni teklif tutarı"
            placeholderTextColor="#999"
            autoFocus
          />
          <View style={styles.counterActions}>
            <TouchableOpacity
              style={[styles.button, styles.counterCancel]}
              onPress={() => {
                setCounterMode(false);
                setCounterValue('');
              }}
            >
              <Text style={styles.counterCancelText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.counterConfirm, isCountering && styles.disabledButton]}
              onPress={handleSubmitCounter}
              disabled={isCountering}
            >
              {isCountering ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.counterConfirmText}>Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isSentOffer && offer.status === 'pending' && (
        <Text style={styles.helper}>Karşı tarafın cevabı bekleniyor.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  userName: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  body: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F2F2F7' },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { marginLeft: 12, flex: 1 },
  productTitle: { fontSize: 15, color: '#333', marginBottom: 6, fontWeight: '500' },
  offerAmount: { fontSize: 14, color: '#8E8E93' },
  amountBold: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rejectButton: { backgroundColor: '#FFF', borderColor: '#FF3B30' },
  rejectButtonText: { color: '#FF3B30', fontWeight: '600', fontSize: 14 },
  counterButton: { backgroundColor: '#FFF', borderColor: '#5856D6' },
  counterButtonText: { color: '#5856D6', fontWeight: '600', fontSize: 14 },
  acceptButton: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  acceptButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  disabledButton: { opacity: 0.5 },
  counterBox: { marginTop: 8, padding: 12, backgroundColor: '#F8F8FB', borderRadius: 10 },
  counterInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  counterActions: { flexDirection: 'row', gap: 8 },
  counterCancel: { backgroundColor: '#FFF', borderColor: '#8E8E93' },
  counterCancelText: { color: '#8E8E93', fontWeight: '600' },
  counterConfirm: { backgroundColor: '#5856D6', borderColor: '#5856D6' },
  counterConfirmText: { color: '#FFF', fontWeight: '600' },
  helper: { marginTop: 8, color: '#8E8E93', fontSize: 12, fontStyle: 'italic' },
});
