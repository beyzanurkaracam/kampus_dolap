// android/app/src/screens/OffersScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { OfferItem } from '../../components/OfferItem';
import { MeetingModal } from '../../components/MeetingModal';

const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

export const OffersScreen = ({ navigation }: any) => {
  const { token, userId } = useAuth();
  
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null);
  
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [selectedOfferForAccept, setSelectedOfferForAccept] = useState<any>(null);
  const [selectedOfferForMeetingChange, setSelectedOfferForMeetingChange] = useState<any>(null); 

  useEffect(() => {
    navigation.setOptions({ title: 'Teklifler' });
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await axios.get(`${API_URL}/offers/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(response.data);
    } catch (error) {
      console.error('Teklifler alınamadı:', error);
      Alert.alert('Hata', 'Teklifler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptPress = (offer: any) => {
    // KONTROL: Eğer gelen teklifte ZATEN mekan ve saat varsa, tekrar seçtirme!
    if (offer.meetingPointId && offer.meetingTime) {
        Alert.alert(
            'Buluşmayı Onayla',
            'Karşı tarafın önerdiği yeri ve saati kabul ediyor musunuz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                { 
                    text: 'Evet, Kabul Et', 
                    onPress: () => {
                        // Mevcut bilgileri kullanarak direkt API'ye yolla
                        confirmAcceptWithMeeting(
                            offer.meetingPointId, 
                            new Date(offer.meetingTime),
                            offer // State'e yazılmasını beklemeden objeyi yolla
                        );
                    }
                }
            ]
        );
    } else {
        // Eğer mekan/saat YOKSA, modalı aç ve kullanıcıdan seçmesini iste
        setSelectedOfferForAccept(offer);
        setMeetingModalVisible(true);
    }
  };

  const confirmAcceptWithMeeting = async (meetingPointId: string, date: Date, offerParam?: any) => {
    const targetOffer = offerParam || selectedOfferForAccept;
    if (!targetOffer) return;

    setMeetingModalVisible(false);
    setOfferActionLoading(`accept-${targetOffer.id}`);
    
    try {
      // API isteğini yap ve cevabı al
      const response = await axios.patch(
        `${API_URL}/offers/${targetOffer.id}/accept`,
        { 
          meetingPointId, 
          meetingTime: date.toISOString() 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newOffer = response.data;

      
      if (newOffer.status === 'meeting_confirmed') {
          Alert.alert(
            ' Harika!', 
            'Buluşma önerisini kabul ettiniz. Ürün rezerve edildi ve anlaşma sağlandı.',
            [{ text: 'Tamam', onPress: () => fetchOffers() }]
          );
      } else {
          Alert.alert(
            ' Teklif İletildi', 
            'Buluşma öneriniz karşı tarafa iletildi. Onayını bekleyin.',
            [{ text: 'Tamam', onPress: () => fetchOffers() }]
          );
      }
      
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.message || 'İşlem başarısız');
    } finally {
      setOfferActionLoading(null);
      setSelectedOfferForAccept(null);
    }
  };

  const handleOfferResponse = async (offerId: string, status: 'reject') => {
    setOfferActionLoading(`${status}-${offerId}`);
    try {
      await axios.patch(
        `${API_URL}/offers/${offerId}/${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Başarılı', 'Teklif reddedildi.');
      fetchOffers(); 
    } catch (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    } finally {
      setOfferActionLoading(null);
    }
  };

  const handleConfirmMeetingPress = async (offerId: string) => {
    try {
      setOfferActionLoading(`confirm-${offerId}`);
      await axios.patch(
        `${API_URL}/offers/${offerId}/confirm-meeting`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Süper! 🤝', 'Buluşma kesinleşti. Ürün sizin için rezerve edildi.');
      fetchOffers();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.message || 'İşlem başarısız');
    } finally {
      setOfferActionLoading(null);
    }
  };

  const handleCounterOffer = async (offerId: string, amount: number) => {
    setOfferActionLoading(`counter-${offerId}`);
    try {
      await axios.post(
        `${API_URL}/offers/${offerId}/counter`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Başarılı', `Karşı teklif (${amount} TL) gönderildi.`);
      fetchOffers(); 

    } catch (error: any) {
        console.error("Counter Error:", error.response?.data);
        const errMsg = error.response?.data?.message || 'Karşı teklif gönderilemedi.';
        Alert.alert('Hata', errMsg);
    } finally {
      setOfferActionLoading(null);
    }
  };

  const handleCounterOfferWithMeeting = async (
    offerId: string, 
    amount: number, 
    meetingPointId: string, 
    meetingTime: Date
  ) => {
    setOfferActionLoading(`counter-${offerId}`);
    try {
      await axios.post(
        `${API_URL}/offers/${offerId}/counter`,
        { 
          amount, 
          meetingPointId, 
          meetingTime: meetingTime.toISOString() 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Başarılı', `Karşı teklif (${amount} TL) ve yeni buluşma detayı gönderildi.`);
      fetchOffers();

    } catch (error: any) {
      console.error("Counter with Meeting Error:", error.response?.data);
      const errMsg = error.response?.data?.message || 'Karşı teklif gönderilemedi.';
      Alert.alert('Hata', errMsg);
    } finally {
      setOfferActionLoading(null);
    }
  };

  const handleMeetingChangeOnly = async (
    offerId: string,
    meetingPointId: string,
    meetingTime: Date
  ) => {
    const currentOffer = offers.find(o => o.id === offerId);
    if (!currentOffer) return;

    setOfferActionLoading(`change-meeting-${offerId}`);
    try {
      await axios.post(
        `${API_URL}/offers/${offerId}/counter`,
        { 
          amount: currentOffer.offerAmount,
          meetingPointId, 
          meetingTime: meetingTime.toISOString() 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Başarılı', 'Buluşma detayı değişikliği gönderildi. Karşı taraftan onay bekleniyor.');
      fetchOffers();

    } catch (error: any) {
      console.error("Meeting Change Error:", error.response?.data);
      const errMsg = error.response?.data?.message || 'Buluşma değiştirilemedi.';
      Alert.alert('Hata', errMsg);
    } finally {
      setOfferActionLoading(null);
    }
  };


  const handleChangeMeetingPress = (offer: any) => {
    setSelectedOfferForMeetingChange(offer);
    setMeetingModalVisible(true);
  };

 
  const handleMeetingModalConfirm = async (meetingPointId: string, date: Date) => {
    if (selectedOfferForAccept) {
      // Kabul Et aksiyonu
      await confirmAcceptWithMeeting(meetingPointId, date);
    } else if (selectedOfferForMeetingChange) {
      // Buluşma Değiştir aksiyonu
      await handleMeetingChangeOnly(selectedOfferForMeetingChange.id, meetingPointId, date);
      setSelectedOfferForMeetingChange(null);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={offers}
        renderItem={({ item }) => (
          <OfferItem 
            offer={item} 
            currentUserId={userId} 
            onAccept={() => handleAcceptPress(item)} 
            onReject={(id) => handleOfferResponse(id, 'reject')}
            onCounter={handleCounterOffer}
            onCounterWithMeeting={handleCounterOfferWithMeeting}
            onMeetingChangeOnly={() => handleChangeMeetingPress(item)} 
            onConfirmMeeting={handleConfirmMeetingPress} 
            loadingId={offerActionLoading}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
             <Text style={styles.emptyIcon}>🏷️</Text>
             <Text style={styles.emptyText}>Bekleyen teklif yok.</Text>
          </View>
        }
      />

      <MeetingModal
        visible={meetingModalVisible}
        onClose={() => {
          setMeetingModalVisible(false);
          setSelectedOfferForAccept(null);
          setSelectedOfferForMeetingChange(null);
        }}
        offer={selectedOfferForAccept || selectedOfferForMeetingChange} 
        onConfirm={handleMeetingModalConfirm} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#8E8E93', textAlign: 'center' },
});