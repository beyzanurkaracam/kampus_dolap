import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';

export interface OfferItemProps {
  offer: any; 
  currentUserId: string;
  isSentOffer?: boolean; 
  onAccept: () => void;
  onReject: (id: string) => void | Promise<void>;
  onCounter: (offerId: string, amount: number) => void | Promise<void>;
  onCounterWithMeeting: (offerId: string, amount: number, meetingPointId: string, meetingTime: Date) => void | Promise<void>;
  onMeetingChangeOnly: () => void;
  onConfirmMeeting: (id: string) => void | Promise<void>;
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

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

export const OfferItem = ({
  offer,
  currentUserId,
  isSentOffer = false,
  onAccept,
  onReject,
  onCounter, 
  onCounterWithMeeting,
  onMeetingChangeOnly,
  onConfirmMeeting,
  loadingId,
}: OfferItemProps) => {
  
  const isAccepting = loadingId === `accept-${offer.id}`;
  const isRejecting = loadingId === `reject-${offer.id}`;
  const isAnyLoading = isAccepting || isRejecting;

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'Bekliyor', color: '#FF9500', bg: '#FFF5E5' };
      case 'accepted': return { text: 'Kabul Edildi', color: '#34C759', bg: '#E8F8EE' };
      case 'rejected': return { text: 'Reddedildi', color: '#FF3B30', bg: '#FFEBEA' };
      case 'meeting_confirmed': return { text: 'Buluşma Onaylandı', color: '#007AFF', bg: '#E5F1FF' };
      default: return { text: status, color: '#8E8E93', bg: '#F2F2F7' };
    }
  };

  const statusDisplay = getStatusDisplay(offer.status);
  const productImage = getImageUrl(offer.product?.images?.[0]?.imageUrl);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.userName} numberOfLines={1}>
          {isSentOffer ? `Alıcı: ${offer.seller?.fullName || 'Satıcı'}` : `Gönderen: ${offer.buyer?.fullName || 'Alıcı'}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusDisplay.bg }]}>
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>
            {statusDisplay.text}
          </Text>
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

      {(offer.meetingPointId || offer.meetingTime) && (
        <View style={styles.meetingInfo}>
          <Text style={styles.meetingText}>📍 Buluşma Yeri: {offer.meetingPointId ? 'Belirlendi' : 'Belirsiz'}</Text>
          <Text style={styles.meetingText}>⏰ Zaman: {formatDate(offer.meetingTime)}</Text>
        </View>
      )}

      {/* KABUL/RED BUTONLARI: Verdiğimiz tekliflerde gizlenir */}
      {offer.status === 'pending' && !isSentOffer && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.button, styles.rejectButton, isAnyLoading && styles.disabledButton]}
            onPress={() => onReject(offer.id)}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            {isRejecting ? <ActivityIndicator size="small" color="#FF3B30" /> : <Text style={styles.rejectButtonText}>Reddet</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.acceptButton, isAnyLoading && styles.disabledButton]}
            onPress={onAccept}
            disabled={isAnyLoading}
            activeOpacity={0.8}
          >
            {isAccepting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptButtonText}>Kabul Et</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* BULUŞMA ONAY BUTONU */}
      {offer.status === 'awaiting_meeting_confirmation' && !isSentOffer &&(
         <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.button, styles.confirmMeetingButton]}
              onPress={() => onConfirmMeeting(offer.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmMeetingText}>Buluşmayı Onayla</Text>
            </TouchableOpacity>
         </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  userName: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  body: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F2F2F7' },
  productImagePlaceholder: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  productInfo: { marginLeft: 12, flex: 1 },
  productTitle: { fontSize: 15, color: '#333', marginBottom: 6, fontWeight: '500' },
  offerAmount: { fontSize: 14, color: '#8E8E93' },
  amountBold: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  meetingInfo: { backgroundColor: '#F9F9F9', padding: 10, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#34C759' },
  meetingText: { fontSize: 13, color: '#333', marginBottom: 2, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rejectButton: { backgroundColor: '#FFF', borderColor: '#FF3B30' },
  rejectButtonText: { color: '#FF3B30', fontWeight: '600', fontSize: 14 },
  acceptButton: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  acceptButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  confirmMeetingButton: { backgroundColor: '#34C759', borderColor: '#34C759' },
  confirmMeetingText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  disabledButton: { opacity: 0.5 },
});