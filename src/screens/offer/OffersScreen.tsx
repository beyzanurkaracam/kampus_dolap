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

interface Offer {
  id: string;
  offerAmount: number;
  status: string;
  buyerId: string;
  sellerId: string;
  buyer?: any;
  product?: any;
}

export const OffersScreen = ({ navigation }: any) => {
  const { userId } = useAuth();

  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Teklifler' });
    fetchOffers();
  }, []);

  const fetchOffers = useCallback(async () => {
    try {
      const [receivedData, sentData] = await Promise.all([
        api.getReceivedOffers(),
        api.getSentOffers(),
      ]);
      setReceivedOffers(receivedData);
      setSentOffers(sentData);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Teklifler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleAccept = useCallback(
    async (offerId: string) => {
      setActionLoading(`accept-${offerId}`);
      try {
        const result = await api.acceptOffer(offerId);
        Alert.alert('Anlaşma Sağlandı 🎉', 'Sohbet başlatıldı. İlk mesajı satıcı atacak.', [
          {
            text: 'Sohbete Git',
            onPress: () => {
              navigation.navigate('ChatDetail', { chatId: result.chatId });
            },
          },
          { text: 'Tamam', style: 'cancel', onPress: fetchOffers },
        ]);
      } catch (error: any) {
        Alert.alert('Hata', error.message || 'Teklif kabul edilemedi');
      } finally {
        setActionLoading(null);
      }
    },
    [fetchOffers, navigation],
  );

  const handleReject = useCallback(
    async (offerId: string) => {
      setActionLoading(`reject-${offerId}`);
      try {
        await api.rejectOffer(offerId);
        Alert.alert('Tamam', 'Teklif iptal edildi.');
        fetchOffers();
      } catch (error: any) {
        Alert.alert('Hata', error.message || 'İşlem gerçekleştirilemedi.');
      } finally {
        setActionLoading(null);
      }
    },
    [fetchOffers],
  );

  const handleCounter = useCallback(
    async (offerId: string, amount: number) => {
      setActionLoading(`counter-${offerId}`);
      try {
        await api.counterOffer(offerId, amount);
        Alert.alert('Başarılı', `Karşı teklif (${amount} TL) gönderildi.`);
        fetchOffers();
      } catch (error: any) {
        Alert.alert('Hata', error.message || 'Karşı teklif gönderilemedi.');
      } finally {
        setActionLoading(null);
      }
    },
    [fetchOffers],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers();
  }, [fetchOffers]);

  const currentData = activeTab === 'received' ? receivedOffers : sentOffers;

  const renderItem = useCallback(
    ({ item }: { item: Offer }) => (
      <OfferItem
        offer={item}
        currentUserId={userId || ''}
        isSentOffer={activeTab === 'sent'}
        onAccept={handleAccept}
        onReject={handleReject}
        onCounter={handleCounter}
        loadingId={actionLoading}
      />
    ),
    [userId, activeTab, handleAccept, handleReject, handleCounter, actionLoading],
  );

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
            Gelen ({receivedOffers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sent' && styles.activeTabButton]}
          onPress={() => setActiveTab('sent')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Verdiğim ({sentOffers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        initialNumToRender={8}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#F2F2F7' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  activeTabText: { color: '#007AFF' },
  list: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 20,
  },
});
