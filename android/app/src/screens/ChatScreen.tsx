import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:3000';

interface Chat {
  id: string;
  buyer: { id: string; fullName: string; profilePhoto?: string };
  seller: { id: string; fullName: string; profilePhoto?: string };
  product: { 
    id: string; 
    title: string; 
    images: Array<{ id: string; imageUrl: string }> 
  };
  lastMessage: string | null;
  updatedAt: string;
}

interface UserStatus {
  userId: string;
  status: 'online' | 'offline';
  lastSeen: number | null;
}

export const ChatsScreen = ({ navigation }: any) => {
  const { token, userId } = useAuth();
  const { socket, isConnected } = useSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());

  console.log('ChatsScreen rendered - token:', !!token, 'userId:', userId);

  const fetchChats = useCallback(async () => {
    try {
      console.log('Fetching chats...');
      const response = await axios.get(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Chats fetched:', response.data.length);
      setChats(response.data);
    } catch (error) {
      console.error('Sohbetler yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const checkUserStatuses = useCallback(() => {
    if (!socket || chats.length === 0) return;

    chats.forEach(chat => {
      const otherUser = getOtherUser(chat);
      
      socket.emit('user:status', otherUser.id, (response: any) => {
        if (response?.success) {
          setUserStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(otherUser.id, response.data);
            return newMap;
          });
        }
      });
    });
  }, [socket, chats]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // ✅ FIX: Interval'i düzgün temizle
  useEffect(() => {
    if (!socket || !isConnected || chats.length === 0) return;

    // İlk kontrol
    checkUserStatuses();

    // 30 saniyede bir güncelle
    const interval = setInterval(() => {
      checkUserStatuses();
    }, 30000);

    // ✅ Cleanup: Component unmount veya dependencies değiştiğinde interval'i temizle
    return () => {
      clearInterval(interval);
    };
  }, [socket, isConnected, chats, checkUserStatuses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const getOtherUser = (chat: Chat) => {
    return chat.buyer.id === userId ? chat.seller : chat.buyer;
  };

  const formatLastSeen = (lastSeen: number | null, status: string) => {
    if (status === 'online') return 'Çevrimiçi';
    if (!lastSeen) return '';

    const now = Date.now();
    const diff = now - lastSeen;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    
    return new Date(lastSeen).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatChatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} dk`;
    if (diffHours < 24) return `${diffHours} saat`;
    if (diffDays < 7) return `${diffDays} gün`;
    
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const otherUser = getOtherUser(item);
    const productImage = item.product?.images?.[0]?.imageUrl;
    const userStatus = userStatuses.get(otherUser.id);
    const isOnline = userStatus?.status === 'online';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('ChatDetail', { 
          chatId: item.id,
          otherUser: otherUser,
          product: item.product,
        })}
      >
        {/* Ürün Resmi - Sol */}
        {productImage ? (
          <Image source={{ uri: productImage }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.productImagePlaceholderText}>📦</Text>
          </View>
        )}

        {/* İçerik Alanı */}
        <View style={styles.chatContent}>
          {/* Header: Avatar + İsim + Tarih */}
          <View style={styles.headerRow}>
            <View style={styles.avatarContainer}>
              {otherUser.profilePhoto ? (
                <Image source={{ uri: otherUser.profilePhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {otherUser.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {isOnline && <View style={styles.onlineIndicator} />}
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {otherUser.fullName}
              </Text>
              <Text style={styles.time}>
                {formatChatTime(item.updatedAt)}
              </Text>
            </View>
          </View>

          {/* Ürün Bilgisi */}
          {item.product && (
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={1}>
                📦 {item.product.title}
              </Text>
            </View>
          )}
          
          {/* Son Mesaj */}
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'Henüz mesaj yok'}
          </Text>

          {/* Durum */}
          {userStatus && (
            <Text style={[styles.statusText, isOnline && styles.onlineText]}>
              {formatLastSeen(userStatus.lastSeen, userStatus.status)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.offlineBannerText}>⚠️ Bağlantı kuruluyor...</Text>
        </View>
      )}

      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Henüz sohbet yok</Text>
            <Text style={styles.emptySubtext}>
              Ürün detayından satıcıyla mesajlaşmaya başlayın
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  offlineBanner: { backgroundColor: '#FF9500', paddingVertical: 8, alignItems: 'center' },
  offlineBannerText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  
  chatItem: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5EA',
    alignItems: 'flex-start',
  },
  
  // Ürün Resmi (Sol)
  productImage: { 
    width: 70, 
    height: 70, 
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
  },
  productImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImagePlaceholderText: {
    fontSize: 32,
  },

  // İçerik Alanı
  chatContent: { 
    flex: 1,
    justifyContent: 'space-between',
  },

  // Header (Avatar + İsim + Tarih)
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: { 
    position: 'relative', 
    marginRight: 8,
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
  },
  avatarPlaceholder: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#007AFF', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  avatarText: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: '700',
  },
  onlineIndicator: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#34C759', 
    borderWidth: 2, 
    borderColor: '#FFF',
  },

  userInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: { 
    flex: 1,
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000',
    marginRight: 8,
  },
  time: { 
    fontSize: 11, 
    color: '#8E8E93',
  },

  // Ürün Bilgisi
  productInfo: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  productTitle: { 
    fontSize: 13, 
    color: '#007AFF',
    fontWeight: '600',
  },

  // Son Mesaj
  lastMessage: { 
    fontSize: 14, 
    color: '#3C3C43',
    marginBottom: 4,
    lineHeight: 18,
  },

  // Durum
  statusText: { 
    fontSize: 11, 
    color: '#8E8E93',
  },
  onlineText: { 
    color: '#34C759', 
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 100, 
    paddingHorizontal: 40,
  },
  emptyIcon: { 
    fontSize: 64, 
    marginBottom: 16,
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000', 
    marginBottom: 8,
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#8E8E93', 
    textAlign: 'center',
  },
});