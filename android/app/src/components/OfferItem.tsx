import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  Alert 
} from 'react-native';

interface OfferItemProps {
  offer: any;
  currentUserId: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCounter: (id: string, amount: number) => void;
  onCounterWithMeeting?: (id: string, amount: number, meetingPointId: string, meetingTime: Date) => void; 
  onMeetingChangeOnly?: () => void; 
  onConfirmMeeting: (id: string) => void;
  loadingId: string | null;
}

export const OfferItem: React.FC<OfferItemProps> = ({ 
  offer, 
  currentUserId,
  onAccept, 
  onReject, 
  onCounter,
  onCounterWithMeeting,
  onMeetingChangeOnly,
  onConfirmMeeting, 
  loadingId 
}) => {
  const productImg = offer.product?.images?.[0]?.imageUrl;
  
  // Roller
  const isBuyer = currentUserId === offer.buyerId;
  const isSeller = currentUserId === offer.sellerId;
  
  // Durumlar
  const isPending = offer.status === 'pending';
  const isAccepted = offer.status === 'accepted'; 
  const isConfirmed = offer.status === 'meeting_confirmed'; 
  
  // Kim son onayı verecek?
  const shouldIConfirm = isAccepted && offer.makerId !== currentUserId;
  
  // Buluşma önerisi kontrolü
  const hasMeetingInfo = offer.meetingPoint && offer.meetingTime;
  const isMeetingProposal = isPending && hasMeetingInfo;
  
  // State'ler
  const [isCounterMode, setIsCounterMode] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  // showMeetingModal kaldırıldı - parent'tan gelecek

  // Renkler
  const getStatusColor = () => {
    if (isConfirmed) return '#34C759';
    if (isAccepted) return '#007AFF';
    if (offer.status === 'rejected') return '#FF3B30';
    if (isMeetingProposal) return '#5856D6';
    return '#FF9500';
  };

  const getStatusText = () => {
    if (isConfirmed) return 'Buluşma Kesinleşti ';
    
    if (isAccepted) {
      if (shouldIConfirm) {
        // Ben onaylayacağım - karşı taraf kabul etti
        const whoAccepted = offer.makerId === offer.buyerId ? 'Alıcı' : 'Satıcı';
        return `${whoAccepted} Kabul Etti - Onayınız Bekleniyor`;
      } else {
        // Ben kabul ettim - karşı taraf onaylayacak
        const whoWillConfirm = offer.makerId === offer.buyerId ? 'Satıcıdan' : 'Alıcıdan';
        return `Gönderildi - ${whoWillConfirm} Onay Bekleniyor`;
      }
    }
    
    if (offer.status === 'rejected') return 'Reddedildi ';
    
    // PENDING durumu
    if (isMeetingProposal) {
      const whoSent = offer.makerId === offer.buyerId ? 'Alıcı' : 'Satıcı';
      return `📍 ${whoSent} Buluşma Önerisi`;
    }
    
    if (offer.makerId === currentUserId) {
      return 'Gönderildi - Cevap Bekleniyor ';
    } else {
      return 'Cevap Vermeniz Bekleniyor ';
    }
  };

  const getHeaderText = () => {
    const who = offer.makerId === offer.buyerId ? 'Alıcı' : 'Satıcı';
    if (isMeetingProposal) return `${who} Buluşma Önerisi`;
    if (offer.makerId === offer.buyerId) return 'Alıcı Fiyat Teklifi';
    return 'Satıcı Karşı Teklifi';
  };

  const handleSendSimpleCounter = () => {
    const amount = parseFloat(counterPrice);
    if (!amount || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
      return;
    }
    onCounter(offer.id, amount);
    setIsCounterMode(false);
    setCounterPrice('');
  };

  return (
    <View style={[styles.card, { borderLeftColor: getStatusColor() }]}>
      
      <View style={styles.header}>
        <Image source={{ uri: productImg || 'https://via.placeholder.com/100' }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.productTitle} numberOfLines={1}>{offer.product.title}</Text>
          
          <Text style={styles.buyerName}>
            {getHeaderText()}: <Text style={{fontWeight: 'bold', color: '#333'}}>{offer.offerAmount} ₺</Text>
          </Text>
          
          {}
          {hasMeetingInfo && (
            <View style={styles.meetingInfo}>
              <Text style={styles.meetingLabel}>
                {isMeetingProposal ? ' Önerilen Buluşma:' : '📍 Buluşma Detayı:'}
              </Text>
              <Text style={styles.meetingText}>🏢 {offer.meetingPoint.name}</Text>
              <Text style={styles.meetingText}>
                🕒 {new Date(offer.meetingTime).toLocaleDateString('tr-TR')} - {new Date(offer.meetingTime).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
              </Text>
            </View>
          )}

          <Text style={[styles.statusBadge, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
  
        {}
        {isPending && (
          offer.makerId !== currentUserId ? (
            
            isCounterMode ? (
              <View style={styles.counterRow}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Tutar" 
                  keyboardType="numeric" 
                  value={counterPrice} 
                  onChangeText={setCounterPrice} 
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendSimpleCounter}>
                  <Text style={styles.buttonText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsCounterMode(false)}>
                  <Text style={styles.cancelText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonContainerColumn}>
                {isMeetingProposal && (
                  <Text style={styles.proposalNote}>
                    {offer.makerId === offer.buyerId ? 'Alıcı' : 'Satıcı'} buluşma yeri ve saati önerdi. 
                    {'\n'}Kabul edebilir veya farklı yer/saat önerebilirsiniz.
                  </Text>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => onReject(offer.id)}>
                    <Text style={styles.buttonText}>Reddet</Text>
                  </TouchableOpacity>
                  
                  {}
                  {isMeetingProposal && onMeetingChangeOnly && (
                    <TouchableOpacity 
                      style={[styles.button, styles.changeMeetingButton]} 
                      onPress={onMeetingChangeOnly}
                    >
                      <Text style={styles.buttonText}>Değiştir</Text>
                    </TouchableOpacity>
                  )}
                  
                  {!isMeetingProposal && (
                    <TouchableOpacity style={[styles.button, styles.counterButton]} onPress={() => setIsCounterMode(true)}>
                      <Text style={[styles.buttonText, {color:'#000'}]}>Fiyat Değiştir</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={() => onAccept(offer.id)}>
                    <Text style={styles.buttonText}>Kabul Et</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : (
            // BENİM GÖNDERDİĞİM TEKLİF
            <Text style={styles.waitingText}>
              {isMeetingProposal 
                ? `${offer.makerId === offer.buyerId ? 'Satıcıdan' : 'Alıcıdan'} yanıt bekleniyor...`
                : `${offer.makerId === offer.buyerId ? 'Satıcıdan' : 'Alıcıdan'} yanıt bekleniyor...`}
            </Text>
          )
        )}

        {}
        {isAccepted && (
          shouldIConfirm ? (
            // BEN ONAYLAMALIYIM
            <View>
              <Text style={styles.infoText}>
                {offer.makerId === offer.buyerId ? 'Alıcı' : 'Satıcı'} teklifi kabul etti. 
                {'\n'}Onaylarsanız buluşma kesinleşir veya yeri değiştirebilirsiniz.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => onReject(offer.id)}>
                  <Text style={styles.buttonText}>Vazgeç</Text>
                </TouchableOpacity>
                
                {}
                {onMeetingChangeOnly && (
                  <TouchableOpacity 
                    style={[styles.button, styles.changeMeetingButton]} 
                    onPress={onMeetingChangeOnly}
                  >
                    <Text style={styles.buttonText}>Yer Değiştir</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={[styles.button, styles.confirmMeetingButton]} onPress={() => onConfirmMeeting(offer.id)}>
                  <Text style={styles.buttonText}>Onayla </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // BEN KABUL ETTİM - KARŞI TARAF ONAYLAYACAK
            <Text style={styles.waitingText}>
              {offer.makerId === offer.buyerId ? 'Satıcıdan' : 'Alıcıdan'} son onay bekleniyor...
            </Text>
          )
        )}

        {}
        {isConfirmed && (
          <Text style={styles.successText}> İyi alışverişler! Ürün rezerve edildi.</Text>
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 10, 
    shadowOpacity: 0.1, 
    elevation: 3, 
    borderLeftWidth: 4 
  },
  header: { flexDirection: 'row', marginBottom: 5 },
  image: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#f0f0f0' },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  buyerName: { fontSize: 13, color: '#555', marginTop: 2 },
  statusBadge: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  
  meetingInfo: { 
    marginVertical: 6, 
    backgroundColor: '#F2F2F7', 
    padding: 6, 
    borderRadius: 6 
  },
  meetingLabel: { fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  meetingText: { fontSize: 12, color: '#000', fontWeight: '500' },

  actionContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  buttonContainerColumn: { flexDirection: 'column', gap: 8, width: '100%' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  proposalNote: { fontSize: 11, color: '#666', fontStyle: 'italic', marginBottom: 5 },

  button: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  acceptButton: { backgroundColor: '#66BB6A' }, // Yumuşak Yeşil (Material Green)
  rejectButton: { backgroundColor: '#EF5350' }, // Yumuşak Kırmızı (Mercan tonu)
  counterButton: { backgroundColor: '#5C9EAD' }, // Pastel Mavi/Yeşil (Gri yerine)
  confirmMeetingButton: { backgroundColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  
  waitingText: { color: '#888', fontStyle: 'italic', fontSize: 12, textAlign: 'center' },
  successText: { color: '#34C759', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  infoText: { fontSize: 12, color: '#007AFF', marginBottom: 10, textAlign: 'center', fontWeight: '500' },
  
  counterRow: { flexDirection: 'row', gap: 5 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  sendButton: { backgroundColor: '#007AFF', width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cancelButton: { backgroundColor: '#ccc', width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cancelText: { fontWeight: 'bold', color: '#333' },
  changeMeetingButton: { backgroundColor: '#5C9EAD' }, // Pastel Mavi/Yeşil (Gri yerine)
});