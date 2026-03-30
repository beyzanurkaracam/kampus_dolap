import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// 👑 MİMARİ KURAL: Axios SİLİNDİ, api.ts import edildi
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// Resim URL'ini çözümleyen yardımcı fonksiyon
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

// 👑 SENIOR DOKUNUŞU: React.memo() ile sarıldı. Gereksiz render'ı engeller.
const ProductMessageCard = React.memo(({ metadata, navigation }: { metadata: any, navigation: any }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(metadata?.productImage);

  return (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.8}
      onPress={() => {
        if (metadata?.productId) {
          navigation.navigate('ProductDetail', { productId: metadata.productId });
        }
      }}
    >
      {!imageError && imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.productCardImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.productCardImage, styles.placeholderImage]}>
          <Text style={styles.placeholderIcon}>📦</Text>
          <Text style={styles.placeholderText}>{imageError ? 'Yüklenemedi' : 'Resim Yok'}</Text>
        </View>
      )}
      
      <View style={styles.productCardInfo}>
        <Text style={styles.productCardTitle} numberOfLines={2}>
           {metadata?.productTitle || 'Ürün'}
        </Text>
        <Text style={styles.productCardPrice}>{metadata?.productPrice} ₺</Text>
        <Text style={styles.productCardText}>Merhaba, bu ürün hakkında bilgi alabilir miyim?</Text>
      </View>
    </TouchableOpacity>
  );
});

export const ChatDetailScreen = ({ route, navigation }: any) => {
  const { chatId, otherUser, product } = route.params;
  const { userId } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState<'online' | 'offline'>('offline');
  const [isTyping, setIsTyping] = useState(false);
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0); 

  // --- Header Ayarları ---
  useEffect(() => {
    navigation.setOptions({
      // 👑 Başlığı geri butonuna rağmen tam ortaya sabitler!
      headerTitleAlign: 'center', 
      
      headerTitle: () => (
        <TouchableOpacity 
          onPress={() => product?.id && navigation.navigate('ProductDetail', { productId: product.id })}
          activeOpacity={0.8}
          disabled={!product?.id}
        >
          <View style={styles.headerTitle}>
            {/* 👑 UX DOKUNUŞU: Ürün ismi kaldırıldı, isim fontu büyütüldü */}
            <Text style={styles.headerName} numberOfLines={1}>{otherUser?.fullName || 'Sohbet'}</Text>
            <Text style={[styles.headerStatus, otherUserStatus === 'online' && styles.headerStatusOnline]}>
              {otherUserStatus === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
            </Text>
          </View>
        </TouchableOpacity>
      ),
    });
  }, [otherUserStatus, otherUser, product, navigation]);

  // --- Yardımcı Metodlar (Memoized) ---
  const markAsRead = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('chat:read', { chatId });
    }
  }, [socket, isConnected, chatId]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.getChatMessages(chatId);
      setMessages(response.reverse()); // En yeni başta olsun (inverted list)
      markAsRead();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Mesajlar yüklenemedi');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [chatId, markAsRead, navigation]);

  // --- İlk Yükleme ---
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // --- Socket Olayları ---
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('chat:join', chatId, (response: any) => {
      if (!response?.success) {
        Alert.alert('Hata', 'Sohbete katılılamadı');
        navigation.goBack();
      }
    });

    const handleNewMessage = (message: any) => {
      setMessages(prev => [message, ...prev]);
      if (message.sender.id !== userId) markAsRead();
    };

    const handleUserTyping = () => {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2500);
    };

    const handleError = (data: any) => {
      Alert.alert('Hata', data.message);
      setSending(false);
    };

    socket.on('chat:newMessage', handleNewMessage);
    socket.on('chat:userTyping', handleUserTyping);
    socket.on('chat:error', handleError);

    return () => {
      socket.emit('chat:leave', chatId);
      socket.off('chat:newMessage', handleNewMessage);
      socket.off('chat:userTyping', handleUserTyping);
      socket.off('chat:error', handleError);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, isConnected, chatId, userId, markAsRead, navigation]);

  // --- Çevrimiçi Durumu Kontrolü ---
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

  // --- Kullanıcı Aksiyonları ---
  const handleTyping = (text: string) => {
    setInputText(text);
    
    // Throttling: Saniyede sadece 1 kere "yazıyor" gönderir
    if (socket && isConnected && text.length > 0) {
      const now = Date.now();
      if (now - lastTypingEmitRef.current > 2000) {
        socket.emit('chat:typing', { chatId });
        lastTypingEmitRef.current = now;
      }
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

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isMyMessage = item.sender.id === userId;
    const timeString = new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    if (item.type === 'product' && item.metadata) {
      return (
        <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
          <ProductMessageCard metadata={item.metadata} navigation={navigation} />
          <Text style={styles.messageTime}>{timeString}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          {!isMyMessage && <Text style={styles.senderName}>{item.sender.fullName}</Text>}
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
            {timeString}
          </Text>
        </View>
      </View>
    );
  }, [userId, navigation]);

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
          <Text style={styles.offlineBannerText}>⚠️ Sunucuya bağlanılıyor...</Text>
        </View>
      )}

      {/* Mesaj Listesi Alanı */}
      <View style={{ flex: 1 }}>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>Henüz mesaj yok. İlk mesajı gönderin! 👋</Text>
            </View>
          }
        />
        {/* Yazıyor Bildirimi */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{otherUser?.fullName?.split(' ')[0]} yazıyor...</Text>
          </View>
        )}
      </View>

      {/* Input Alanı */}
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
          style={[styles.sendButton, (!inputText.trim() || sending || !isConnected) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending || !isConnected}
          activeOpacity={0.8}
        >
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sendButtonText}>Gönder</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyMessagesText: { fontSize: 16, color: '#8E8E93', textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  headerTitle: { alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '600', color: '#000' }, // 👑 Boyut büyütüldü
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
  typingContainer: { position: 'absolute', bottom: 5, left: 16, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  typingText: { fontSize: 13, color: '#8E8E93', fontStyle: 'italic', fontWeight: '500' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, marginRight: 8, color: '#000' },
  sendButton: { backgroundColor: '#007AFF', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  sendButtonDisabled: { backgroundColor: '#C7C7CC' },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  productCard: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E5EA', width: 250, maxWidth: 280 },
  productCardImage: { width: '100%', height: 180, backgroundColor: '#F2F2F7' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E5EA' },
  placeholderIcon: { fontSize: 32, marginBottom: 4 },
  placeholderText: { fontSize: 12, color: '#8E8E93' },
  productCardInfo: { padding: 12 },
  productCardTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 6 },
  productCardPrice: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  productCardText: { fontSize: 14, color: '#3C3C43', lineHeight: 20 },
});