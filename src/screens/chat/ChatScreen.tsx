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
} from 'react-native';

// 👑 MİMARİ KURAL: Axios SİLİNDİ, api.ts import edildi
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// --- TİP TANIMLAMALARI ---
interface ProductImage { id: string; imageUrl: string; isPrimary: boolean; }
interface Product { id: string; title: string; price: number; images: ProductImage[]; }
interface User { id: string; fullName: string; profilePhoto?: string; }
interface Chat {
  id: string;
  buyer: User;
  seller: User;
  product?: Product;
  lastMessage?: string;
  updatedAt: string;
}

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

export const ChatScreen = ({ navigation }: any) => {
  const { userId } = useAuth(); // Token'a ihtiyacımız yok, api.ts hallediyor
  const { socket, isConnected } = useSocket();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Map<string, { status: 'online' | 'offline' }>>(new Map());

  // --- Yardımcı Metodlar (Memoized) ---
  const checkUserStatus = useCallback((targetUserId: string) => {
    if (socket && isConnected) {
      socket.emit('user:status', targetUserId, (response: any) => {
        if (response?.success) {
          setUserStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(targetUserId, { status: response.data.status });
            return newMap;
          });
        }
      });
    }
  }, [socket, isConnected]);

  const fetchChats = useCallback(async () => {
    try {
      // 👑 MİMARİ KURAL: api.ts üzerinden güvenli çağrı
      const response = await api.getChats();
      setChats(response);
      
      // Her sohbet için karşı tarafın çevrimiçi durumunu sorgula
      response.forEach((chat: Chat) => {
        const otherUserId = chat.buyer.id === userId ? chat.seller.id : chat.buyer.id;
        checkUserStatus(otherUserId);
      });
    } catch (error) {
      console.error('Sohbetler yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, checkUserStatus]);

  // --- İlk Yükleme & Navigasyon Ayarı ---
  useEffect(() => {
    navigation.setOptions({ title: 'Mesajlar' });
    fetchChats();
  }, [fetchChats, navigation]);

  // --- Socket Dinleyicileri (Listeners) ---
  useEffect(() => {
    if (!socket || !isConnected) return;
    
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
          // Güncellenen sohbeti listenin en üstüne taşı
          const [updated] = updatedChats.splice(index, 1);
          return [updated, ...updatedChats];
        }
        return prevChats;
      });
    };

    const handleUserStatusChange = (data: { userId: string; status: 'online' | 'offline' }) => {
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, { status: data.status });
        return newMap;
      });
    };

    socket.on('chat:updated', handleChatUpdate);
    socket.on('user:statusChanged', handleUserStatusChange);
    
    return () => {
      socket.off('chat:updated', handleChatUpdate);
      socket.off('user:statusChanged', handleUserStatusChange);
    };
  }, [socket, isConnected]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats();
  }, [fetchChats]);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    else if (diffInHours < 48) return 'Dün';
    else return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  // 👑 SENIOR DOKUNUŞU: UI/UX düzeltildi ve performans için useCallback eklendi.
  const renderChat = useCallback(({ item }: { item: Chat }) => {
    const otherUser = item.buyer.id === userId ? item.seller : item.buyer;
    const productImage = getImageUrl(item.product?.images?.[0]?.imageUrl);
    const avatarImage = getImageUrl(otherUser.profilePhoto);
    const userStatus = userStatuses.get(otherUser.id);
    const isOnline = userStatus?.status === 'online';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
      >
        {/* DOĞRU UX: En Solda Kullanıcı Avatarı Olmalı */}
        <View style={styles.avatarContainer}>
          {avatarImage ? (
            <Image source={{ uri: avatarImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{otherUser.fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {/* Çevrimiçi/Çevrimdışı Noktası Avatarın Üstüne Biner */}
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#9E9E9E' }]} />
        </View>

        {/* ORTA: İsim ve Son Mesaj */}
        <View style={styles.chatCenter}>
          <View style={styles.chatHeaderRow}>
             <Text style={styles.chatName} numberOfLines={1}>{otherUser.fullName}</Text>
             <Text style={styles.timestamp}>{formatTimestamp(item.updatedAt)}</Text>
          </View>
          
          {item.product && (
            <Text style={styles.productTitle} numberOfLines={1}>📦 {item.product.title}</Text>
          )}

          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'Henüz mesaj yok...'}
          </Text>
        </View>

        {/* SAĞ: İlgili Ürünün Küçük Resmi (Letgo / Sahibinden Tarzı) */}
        {item.product && (
          <View style={styles.chatRight}>
            {productImage ? (
              <Image source={{ uri: productImage }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                 <Text style={styles.productImagePlaceholderText}>📷</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [userId, userStatuses, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>⚠️ Sunucuya bağlanılıyor...</Text>
        </View>
      )}

      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
        // 👑 Performans Kilitleri
        initialNumToRender={10}
        windowSize={5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
             <Text style={styles.emptyIcon}>📭</Text>
             <Text style={styles.emptyText}>Henüz mesajınız yok.</Text>
          </View>
        }
      />
    </View>
  );
};

// Tasarım baştan aşağı "Dünya Standartlarına" uygun şekilde revize edildi
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: { backgroundColor: '#FF9500', paddingVertical: 6, alignItems: 'center' },
  offlineBannerText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  chatList: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, fontWeight: '500', color: '#8E8E93', marginBottom: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center', // Öğeleri dikeyde ortalar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  avatarContainer: { marginRight: 12, position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#E5E5EA' },
  avatarPlaceholder: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '600' },
  statusDot: { 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    borderWidth: 2, 
    borderColor: '#FFF' 
  },
  
  chatCenter: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1, paddingRight: 8 },
  timestamp: { fontSize: 12, color: '#8E8E93' },
  
  productTitle: { fontSize: 12, color: '#007AFF', marginBottom: 4, fontWeight: '600' },
  lastMessage: { fontSize: 14, color: '#3C3C43' },
  
  chatRight: { marginLeft: 12 },
  productImage: { width: 45, height: 45, borderRadius: 8, backgroundColor: '#F2F2F7' },
  productImagePlaceholder: { width: 45, height: 45, borderRadius: 8, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  productImagePlaceholderText: { fontSize: 18 },
});