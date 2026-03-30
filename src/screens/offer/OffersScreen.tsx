import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { OfferItem } from '../../components/OfferItem';
import { MeetingModal } from '../../components/MeetingModal';

interface Offer {
  id: string;
  offerAmount: number;
  status: string;
  meetingPointId?: string;
  meetingTime?: string;
  [key: string]: any; 
}

interface ModalConfig {
  visible: boolean;
  offer: Offer | null;
  mode: 'accept' | 'change';
}

export const OffersScreen = ({ navigation }: any) => {
  const { userId } = useAuth(); 
  
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null);
  
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    offer: null,
    mode: 'accept'
  });

  useEffect(() => {
    navigation.setOptions({ title: 'Teklifler' });
    fetchOffers();
  }, []);

  const fetchOffers = useCallback(async () => {
    try {
      const [receivedData, sentData] = await Promise.all([
        api.getReceivedOffers(),
        api.getSentOffers()
      ]);
      
      setReceivedOffers(receivedData);
      setSentOffers(sentData);
    } catch (error: any) {
      console.error('Teklifler alınamadı:', error);
      Alert.alert('Hata', error.message || 'Teklifler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const closeModal = () => {
    setModalConfig({ visible: false, offer: null, mode: 'accept' });
  };

  const handleAcceptPress = useCallback((offer: Offer) => {
    if (offer.meetingPointId && offer.meetingTime) {
        Alert.alert(
            'Buluşmayı Onayla',
            'Karşı tarafın önerdiği yeri ve saati kabul ediyor musunuz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                { 
                    text: 'Evet, Kabul Et', 
                    onPress: () => confirmAcceptWithMeeting(offer.meetingPointId!, new Date(offer.meetingTime!), offer)
                }
            ]
        );
    } else {
        setModalConfig({ visible: true, offer, mode: 'accept' });
    }
  }, []);

  const confirmAcceptWithMeeting = async (meetingPointId: string, date: Date, offerParam?: Offer) => {
    const targetOffer = offerParam || modalConfig.offer;
    if (!targetOffer) return;

    closeModal();
    setOfferActionLoading(`accept-${targetOffer.id}`);
    
    try {
      const newOffer = await api.acceptOffer(targetOffer.id, { 
        meetingPointId, 
        meetingTime: date.toISOString() 
      });
      
      if (newOffer.status === 'meeting_confirmed') {
          Alert.alert('Harika! 🤝', 'Buluşma önerisini kabul ettiniz. Ürün rezerve edildi.', [{ text: 'Tamam', onPress: fetchOffers }]);
      } else {
          Alert.alert('Teklif İletildi 📨', 'Buluşma öneriniz karşı tarafa iletildi. Onayını bekleyin.', [{ text: 'Tamam', onPress: fetchOffers }]);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız');
    } finally {
      setOfferActionLoading(null);
    }
  };

  const handleOfferResponse = useCallback(async (offerId: string, status: 'reject') => {
    setOfferActionLoading(`${status}-${offerId}`);
    try {
      await api.rejectOffer(offerId);
      Alert.alert('Başarılı', 'Teklif reddedildi.');
      fetchOffers(); 
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem gerçekleştirilemedi.');
    } finally {
      setOfferActionLoading(null);
    }
  }, [fetchOffers]);

  const handleConfirmMeetingPress = useCallback(async (offerId: string) => {
    setOfferActionLoading(`confirm-${offerId}`);
    try {
      await api.confirmMeeting(offerId);
      Alert.alert('Süper! 🤝', 'Buluşma kesinleşti. Ürün sizin için rezerve edildi.');
      fetchOffers();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız');
    } finally {
      setOfferActionLoading(null);
    }
  }, [fetchOffers]);

  const handleCounterOffer = useCallback(async (offerId: string, amount: number) => {
    setOfferActionLoading(`counter-${offerId}`);
    try {
      await api.counterOffer(offerId, { amount });
      Alert.alert('Başarılı', `Karşı teklif (${amount} TL) gönderildi.`);
      fetchOffers(); 
    } catch (error: any) {
        Alert.alert('Hata', error.message || 'Karşı teklif gönderilemedi.');
    } finally {
      setOfferActionLoading(null);
    }
  }, [fetchOffers]);

  const handleCounterOfferWithMeeting = useCallback(async (offerId: string, amount: number, meetingPointId: string, meetingTime: Date) => {
    setOfferActionLoading(`counter-${offerId}`);
    try {
      await api.counterOffer(offerId, { 
        amount, 
        meetingPointId, 
        meetingTime: meetingTime.toISOString() 
      });
      Alert.alert('Başarılı', `Karşı teklif (${amount} TL) ve yeni buluşma detayı gönderildi.`);
      fetchOffers();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Karşı teklif gönderilemedi.');
    } finally {
      setOfferActionLoading(null);
    }
  }, [fetchOffers]);

  const handleMeetingChangeOnly = async (meetingPointId: string, meetingTime: Date) => {
    const targetOffer = modalConfig.offer;
    if (!targetOffer) return;

    setOfferActionLoading(`change-meeting-${targetOffer.id}`);
    try {
      await api.counterOffer(targetOffer.id, { 
        amount: targetOffer.offerAmount,
        meetingPointId, 
        meetingTime: meetingTime.toISOString() 
      });
      
      Alert.alert('Başarılı', 'Buluşma detayı değişikliği gönderildi. Karşı taraftan onay bekleniyor.');
      closeModal();
      fetchOffers();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Buluşma değiştirilemedi.');
    } finally {
      setOfferActionLoading(null);
    }
  };

  const handleChangeMeetingPress = useCallback((offer: Offer) => {
    setModalConfig({ visible: true, offer, mode: 'change' });
  }, []);

  const handleMeetingModalConfirm = async (meetingPointId: string, date: Date) => {
    if (modalConfig.mode === 'accept') {
      await confirmAcceptWithMeeting(meetingPointId, date);
    } else if (modalConfig.mode === 'change') {
      await handleMeetingChangeOnly(meetingPointId, date);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers();
  }, [fetchOffers]);

  const currentData = activeTab === 'received' ? receivedOffers : sentOffers;

  const renderOfferItem = useCallback(({ item }: { item: Offer }) => (
    <OfferItem 
      offer={item} 
      currentUserId={userId || ''} 
      isSentOffer={activeTab === 'sent'} 
      onAccept={() => handleAcceptPress(item)} 
      onReject={(id) => handleOfferResponse(id, 'reject')}
      onCounter={handleCounterOffer}
      onCounterWithMeeting={handleCounterOfferWithMeeting}
      onMeetingChangeOnly={() => handleChangeMeetingPress(item)} 
      onConfirmMeeting={handleConfirmMeetingPress} 
      loadingId={offerActionLoading}
    />
  ), [userId, activeTab, handleAcceptPress, handleOfferResponse, handleCounterOffer, handleCounterOfferWithMeeting, handleChangeMeetingPress, handleConfirmMeetingPress, offerActionLoading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'received' && styles.activeTabButton]}
          onPress={() => setActiveTab('received')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Gelen Teklifler ({receivedOffers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'sent' && styles.activeTabButton]}
          onPress={() => setActiveTab('sent')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Verdiğim Teklifler ({sentOffers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentData}
        renderItem={renderOfferItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
        initialNumToRender={8} 
        maxToRenderPerBatch={5}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
             <Text style={styles.emptyIcon}>🏷️</Text>
             <Text style={styles.emptyText}>
                {activeTab === 'received' 
                  ? 'Şu an bekleyen bir teklifiniz bulunmuyor.' 
                  : 'Henüz kimseye teklif göndermediniz.'}
             </Text>
          </View>
        }
      />

      <MeetingModal
        visible={modalConfig.visible}
        onClose={closeModal}
        offer={modalConfig.offer} 
        onConfirm={handleMeetingModalConfirm} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#F2F2F7' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  activeTabText: { color: '#007AFF' },
  list: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#8E8E93', textAlign: 'center', fontWeight: '500', paddingHorizontal: 20 },
});