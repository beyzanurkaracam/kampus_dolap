import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';
interface Message {
  id: string;
  sender: {
    id: string;
    fullName: string;
    profilePhoto?: string;
  };
  content: string;
  type: 'text' | 'product' | 'image' | 'system'; 
  metadata?: {
    productId?: string;
    productTitle?: string;
    productPrice?: number;
    productImage?: string;
  };
  createdAt: string;
  isRead: boolean;
}

// ✅ URL Düzenleyici
const getImageUrl = (url?: string) => {
  if (!url) return undefined;

  let finalUrl = url.trim();

  // 1. Android Emülatör Düzeltmesi
  if (Platform.OS === 'android') {
    if (finalUrl.includes('localhost')) {
      finalUrl = finalUrl.replace('localhost', '10.0.2.2');
    } else if (finalUrl.includes('127.0.0.1')) {
      finalUrl = finalUrl.replace('127.0.0.1', '10.0.2.2');
    }
  }

  // 2. HTTP/HTTPS kontrolü (S3 linkleri buraya düşer)
  if (finalUrl.startsWith('http')) return finalUrl;

  // 3. Local path ise API_URL ekle
  const cleanPath = finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl;
  return `${API_URL}/${cleanPath}`;
};

// ✅ AYRI BİLEŞEN: Ürün Mesaj Kartı
const ProductMessageCard = ({ metadata, navigation }: { metadata: any, navigation: any }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(metadata?.productImage);

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => {
        if (metadata?.productId) {
          navigation.navigate('ProductDetail', { productId: metadata.productId });
        }
      }}
    >
      {/* Resim Alanı */}
      {!imageError && imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.productCardImage}
          resizeMode="cover"
          onError={(e) => {
            console.warn('Image Load Error:', e.nativeEvent.error);
            setImageError(true);
          }}
        />
      ) : (
        // Resim yüklenemezse veya yoksa gösterilecek alan
        <View style={[styles.productCardImage, styles.placeholderImage]}>
          <Text style={styles.placeholderIcon}>📦</Text>
          <Text style={styles.placeholderText}>
            {imageError ? 'Yüklenemedi' : 'Resim Yok'}
          </Text>
        </View>
      )}
      
      {/* Ürün Bilgileri */}
      <View style={styles.productCardInfo}>
        <Text style={styles.productCardTitle} numberOfLines={2}>
          📦 {metadata?.productTitle || 'Ürün'}
        </Text>
        <Text style={styles.productCardPrice}>
          💰 {metadata?.productPrice} ₺
        </Text>
        <Text style={styles.productCardText}>
          Merhaba, bu ürün hakkında bilgi alabilir miyim?
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const ChatDetailScreen = ({ route, navigation }: any) => {
  const { chatId, otherUser, product } = route.params;
  const { token, userId } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState<'online' | 'offline'>('offline');
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity 
          onPress={() => product?.id && navigation.navigate('ProductDetail', { productId: product.id })}
          activeOpacity={0.8}
          disabled={!product?.id}
        >
          <View style={styles.headerTitle}>
            <Text style={styles.headerProductTitle} numberOfLines={1}>
              📦 {product?.title || 'Ürün'}
            </Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser?.fullName || 'Sohbet'}
            </Text>
            <Text style={[
              styles.headerStatus,
              otherUserStatus === 'online' && styles.headerStatusOnline
            ]}>
              {otherUserStatus === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
            </Text>
          </View>
        </TouchableOpacity>
      ),
    });
  }, [otherUserStatus, otherUser, product, navigation]);

  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('chat:join', chatId, (response: any) => {
      if (!response?.success) {
        Alert.alert('Hata', 'Sohbete katılılamadı');
        navigation.goBack();
      }
    });

    socket.on('chat:newMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      if (message.sender.id !== userId) {
        markAsRead();
      }
    });

    socket.on('chat:userTyping', () => {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
    });

    socket.on('chat:error', (data: any) => {
      Alert.alert('Hata', data.message);
      setSending(false);
    });

    return () => {
      socket.emit('chat:leave', chatId);
      socket.off('chat:newMessage');
      socket.off('chat:userTyping');
      socket.off('chat:error');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, isConnected, chatId]);

  useEffect(() => {
    if (!socket || !isConnected || !otherUser) return;
    const checkStatus = () => {
      socket.emit('user:status', otherUser.id, (response: any) => {
        if (response?.success) setOtherUserStatus(response.data.status);
      });
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [socket, isConnected, otherUser]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setMessages(response.data);
      setTimeout(scrollToBottom, 100);
      markAsRead();
    } catch (error: any) {
      console.error('Mesajlar yüklenirken hata:', error);
      Alert.alert('Hata', 'Mesajlar yüklenemedi');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      if (socket && isConnected) {
        socket.emit('chat:read', { chatId });
      }
    } catch (error) {
      console.error('Okundu işaretleme hatası:', error);
    }
  };

  const sendMessage = () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || !socket || !isConnected || sending) return;

    setSending(true);
    socket.emit('chat:send', { chatId, content: trimmedText }, (response: any) => {
      setSending(false);
      if (response?.success) {
        setInputText('');
      } else {
        Alert.alert('Hata', response?.error || 'Mesaj gönderilemedi');
      }
    });
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (socket && isConnected && text.length > 0) {
      socket.emit('chat:typing', { chatId });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender.id === userId;

    if (item.type === 'product' && item.metadata) {
      return (
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
        ]}>
          <ProductMessageCard metadata={item.metadata} navigation={navigation} />
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.sender.fullName}</Text>
          )}
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>⚠️ Bağlantı kuruluyor...</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMessagesText}>Henüz mesaj yok. İlk mesajı gönderin! 👋</Text>
          </View>
        }
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>Yazıyor...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTyping}
          placeholder="Mesajınız..."
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={1000}
          editable={!sending && isConnected}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || sending || !isConnected) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending || !isConnected}
        >
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sendButtonText}>Gönder</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  headerTitle: { alignItems: 'center' },
  headerProductTitle: { fontSize: 14, fontWeight: '700', color: '#007AFF', marginBottom: 2 },
  headerName: { fontSize: 14, fontWeight: '500', color: '#000' },
  headerStatus: { fontSize: 11, color: '#8E8E93' },
  headerStatusOnline: { color: '#34C759' },
  offlineBanner: { backgroundColor: '#FF9500', paddingVertical: 6, alignItems: 'center' },
  offlineBannerText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  messagesList: { padding: 16, flexGrow: 1 },
  
  messageContainer: { marginVertical: 4, width: '100%' },
  myMessageContainer: { alignItems: 'flex-end' },
  otherMessageContainer: { alignItems: 'flex-start' },

  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16, marginBottom: 4 },
  myMessageBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  otherMessageBubble: { backgroundColor: '#FFF', alignSelf: 'flex-start' },

  senderName: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 4 },
  messageText: { fontSize: 16, lineHeight: 20 },
  myMessageText: { color: '#FFF' },
  otherMessageText: { color: '#000' },
  messageTime: { fontSize: 11, marginTop: 4 },
  myMessageTime: { color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right' },
  otherMessageTime: { color: '#8E8E93' },

  typingContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  typingText: { fontSize: 13, color: '#8E8E93', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, marginRight: 8, color: '#000' },
  sendButton: { backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  sendButtonDisabled: { backgroundColor: '#C7C7CC' },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyMessagesText: { fontSize: 16, color: '#8E8E93', textAlign: 'center' },

  // ✅ GÜNCELLENEN STİL: Sabit genişlik verildi
  productCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#E5E5EA', 
    width: 250, // Sabit genişlik eklendi
    maxWidth: 280 
  },
  productCardImage: { width: '100%', height: 180, backgroundColor: '#F2F2F7' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E5EA' },
  placeholderIcon: { fontSize: 32, marginBottom: 4 },
  placeholderText: { fontSize: 12, color: '#8E8E93' },
  productCardInfo: { padding: 12 },
  productCardTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 6 },
  productCardPrice: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  productCardText: { fontSize: 14, color: '#3C3C43', lineHeight: 20 },
});