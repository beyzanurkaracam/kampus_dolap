import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { OfferItem } from '../components/OfferItem'; 

const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
}

interface Product {
  id: string;
  title: string;
  price: number;
  images: ProductImage[];
}

interface User {
  id: string;
  fullName: string;
  profilePhoto?: string;
}

interface Chat {
  id: string;
  buyer: User;
  seller: User;
  product?: Product;
  lastMessage?: string;
  updatedAt: string;
}

type TabType = 'all' | 'offers' | 'comments';

export const ChatScreen = ({ navigation }: any) => {
  const { token, userId } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [offers, setOffers] = useState<any[]>([]); 
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Map<string, { status: 'online' | 'offline' }>>(new Map());

  useEffect(() => {
    navigation.setOptions({ title: 'Bildirimler' });
  }, [navigation]);

  useEffect(() => {
    if (activeTab === 'offers') {
      fetchOffers();
    } else {
      fetchChats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.on('chat:updated', handleChatUpdate);
    socket.on('user:statusChanged', handleUserStatusChange);
    return () => {
      socket.off('chat:updated', handleChatUpdate);
      socket.off('user:statusChanged', handleUserStatusChange);
    };
  }, [socket, isConnected]);

  // --- API İŞLEMLERİ ---

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/offers/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(response.data);
    } catch (error) {
      console.error('Teklifler alınamadı:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(response.data);
      
      if (activeTab === 'comments') {
        const comments = response.data.filter((c: any) => 
          !c.lastMessage?.includes('💰') && 
          !c.lastMessage?.toLowerCase().includes('teklif')
        );
        setFilteredChats(comments);
      } else {
        setFilteredChats(response.data);
      }
      
      response.data.forEach((chat: Chat) => {
        const otherUserId = chat.buyer.id === userId ? chat.seller.id : chat.buyer.id;
        checkUserStatus(otherUserId);
      });
    } catch (error) {
      console.error('Chatler yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOfferResponse = async (offerId: string, status: 'accept' | 'reject') => {
    setOfferActionLoading(`${status}-${offerId}`);
    try {
      await axios.patch(
        `${API_URL}/offers/${offerId}/${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Başarılı', `Teklif ${status === 'accept' ? 'kabul edildi' : 'reddedildi'}.`);
      fetchOffers(); 
    } catch (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    } finally {
      setOfferActionLoading(null);
    }
  };

  // ✅ YENİ: Karşı Teklif Gönderme Fonksiyonu
  const handleCounterOffer = async (offerId: string, amount: number) => {
    setOfferActionLoading(`counter-${offerId}`);
    try {
      await axios.post(
        `${API_URL}/offers/${offerId}/counter`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Başarılı', `Karşı teklif (${amount} TL) gönderildi. Sıra karşı tarafta.`);
      
      // Listeyi yenile (Teklif artık bende değil, listeden gitmeli)
      fetchOffers(); 

    } catch (error: any) {
        console.error("Counter Error:", error.response?.data);
        const errMsg = error.response?.data?.message || 'Karşı teklif gönderilemedi.';
        Alert.alert('Hata', errMsg);
    } finally {
      setOfferActionLoading(null);
    }
  };

  // --- YARDIMCI FONKSİYONLAR ---

  const checkUserStatus = (userId: string) => {
    if (socket && isConnected) {
      socket.emit('user:status', userId, (response: any) => {
        if (response?.success) {
          setUserStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(userId, { status: response.data.status });
            return newMap;
          });
        }
      });
    }
  };

  const handleChatUpdate = (data: any) => {
    setChats(prevChats => {
      const index = prevChats.findIndex(c => c.id === data.chatId);
      if (index !== -1) {
        const updatedChats = [...prevChats];
        updatedChats[index] = {
          ...updatedChats[index],
          lastMessage: data.message.content,
          updatedAt: data.message.createdAt,
        };
        const [updated] = updatedChats.splice(index, 1);
        return [updated, ...updatedChats];
      }
      return prevChats;
    });
    
    if (activeTab !== 'offers') fetchChats(); 
  };

  const handleUserStatusChange = (data: { userId: string; status: 'online' | 'offline' }) => {
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(data.userId, { status: data.status });
      return newMap;
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'offers') fetchOffers();
    else fetchChats();
  }, [activeTab]);

  const getOtherUser = (chat: Chat): User => {
    return chat.buyer.id === userId ? chat.seller : chat.buyer;
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    else if (diffInHours < 48) return 'Dün';
    else return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const otherUser = getOtherUser(item);
    const productImage = item.product?.images?.[0]?.imageUrl;
    const userStatus = userStatuses.get(otherUser.id);
    const isOnline = userStatus?.status === 'online';
    const isOfferMessage = item.lastMessage?.includes('💰');

    return (
      <TouchableOpacity
        style={[styles.chatItem, isOfferMessage && styles.offerChatItem]}
        onPress={() => {
          navigation.navigate('ChatDetail', { 
            chatId: item.id,
            otherUser: otherUser,
            product: item.product,
          });
        }}
      >
        <View style={styles.chatLeft}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.productImagePlaceholderText}>📦</Text>
            </View>
          )}
        </View>

        <View style={styles.chatCenter}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{otherUser.fullName}</Text>
            {isOfferMessage && <Text style={styles.offerBadge}>TEKLİF</Text>}
          </View>
          
          {item.product && (
            <Text style={styles.productTitle} numberOfLines={1}>
              {item.product.title}
            </Text>
          )}

          <Text style={[styles.lastMessage, isOfferMessage && styles.offerText]} numberOfLines={1}>
            {item.lastMessage || 'Henüz mesaj yok'}
          </Text>

          <Text style={styles.timestamp}>
            {formatTimestamp(item.updatedAt)}
          </Text>
        </View>

        <View style={styles.chatRight}>
          {otherUser.profilePhoto ? (
            <Image source={{ uri: otherUser.profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{otherUser.fullName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* TAB BAR */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'all' && styles.activeTabButton]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>Tümü</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'offers' && styles.activeTabButton]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>Teklifler</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'comments' && styles.activeTabButton]}
          onPress={() => setActiveTab('comments')}
        >
          <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>Yorumlar</Text>
        </TouchableOpacity>
      </View>

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>⚠️ Bağlantı kuruluyor...</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : activeTab === 'offers' ? (
        // ✅ TEKLİF LİSTESİ (Yeni Prop Eklendi)
        <FlatList
          data={offers}
          renderItem={({ item }) => (
            <OfferItem 
              offer={item} 
              onAccept={(id) => handleOfferResponse(id, 'accept')}
              onReject={(id) => handleOfferResponse(id, 'reject')}
              onCounter={handleCounterOffer} // 👈 Bağlandı
              loadingId={offerActionLoading}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyIcon}>🏷️</Text>
               <Text style={styles.emptyText}>Bekleyen bir teklif yok.</Text>
            </View>
          }
        />
      ) : (
        // ✅ CHAT LİSTESİ
        <FlatList
          data={filteredChats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyIcon}>📭</Text>
               <Text style={styles.emptyText}>Henüz mesaj yok.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 10,
        justifyContent: 'space-around',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        minWidth: 80,
        alignItems: 'center',
    },
    activeTabButton: { backgroundColor: '#007AFF' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
    activeTabText: { color: '#FFF' },
    offlineBanner: { backgroundColor: '#FF9500', paddingVertical: 6, alignItems: 'center' },
    offlineBannerText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    chatList: { padding: 12 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 8 },
    emptyIcon: { fontSize: 40, marginBottom: 10 },
    
    // Chat Item Stilleri
    chatItem: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    offerChatItem: {
        borderLeftWidth: 4,
        borderLeftColor: '#34C759',
    },
    chatLeft: { marginRight: 12 },
    productImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F2F2F7' },
    productImagePlaceholder: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
    productImagePlaceholderText: { fontSize: 24 },
    chatCenter: { flex: 1, justifyContent: 'center' },
    chatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    chatName: { fontSize: 16, fontWeight: '600', color: '#000', marginRight: 8 },
    offerBadge: { fontSize: 10, fontWeight: 'bold', color: '#34C759', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    productTitle: { fontSize: 13, color: '#007AFF', marginBottom: 4, fontWeight: '500' },
    lastMessage: { fontSize: 14, color: '#3C3C43', marginBottom: 4 },
    offerText: { fontWeight: '600', color: '#333' },
    timestamp: { fontSize: 12, color: '#8E8E93' },
    chatRight: { alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 4 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    avatarText: { color: '#FFF', fontSize: 20, fontWeight: '600' },
    statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
});