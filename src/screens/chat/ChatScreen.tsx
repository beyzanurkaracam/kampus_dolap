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

import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

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

export const ChatScreen = ({ navigation }: any) => {
  const { token, userId } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Map<string, { status: 'online' | 'offline' }>>(new Map());

  useEffect(() => {
    navigation.setOptions({ title: 'Mesajlar' });
    fetchChats();
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    socket.on('chat:updated', handleChatUpdate);
    socket.on('user:statusChanged', handleUserStatusChange);
    
    return () => {
      socket.off('chat:updated', handleChatUpdate);
      socket.off('user:statusChanged', handleUserStatusChange);
    };
  }, [socket, isConnected]);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(response.data);
      
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
    fetchChats();
  }, []);

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

    return (
      <TouchableOpacity
        style={styles.chatItem}
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
          </View>
          
          {item.product && (
            <Text style={styles.productTitle} numberOfLines={1}>
              {item.product.title}
            </Text>
          )}

          <Text style={styles.lastMessage} numberOfLines={1}>
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
        contentContainerStyle={styles.chatList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
             <Text style={styles.emptyIcon}>📭</Text>
             <Text style={styles.emptyText}>Henüz mesaj yok.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: { backgroundColor: '#FF9500', paddingVertical: 6, alignItems: 'center' },
  offlineBannerText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  chatList: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  
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
  chatLeft: { marginRight: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F2F2F7' },
  productImagePlaceholder: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  productImagePlaceholderText: { fontSize: 24 },
  chatCenter: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#000', marginRight: 8 },
  productTitle: { fontSize: 13, color: '#007AFF', marginBottom: 4, fontWeight: '500' },
  lastMessage: { fontSize: 14, color: '#3C3C43', marginBottom: 4 },
  timestamp: { fontSize: 12, color: '#8E8E93' },
  chatRight: { alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 4 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '600' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});