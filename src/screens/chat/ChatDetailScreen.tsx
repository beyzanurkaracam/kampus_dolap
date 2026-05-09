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

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

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

export const ChatDetailScreen = ({ route, navigation }: any) => {
  const { chatId } = route.params;
  const { userId } = useAuth();
  const { socket, isConnected } = useSocket();

  const [chat, setChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState<'online' | 'offline'>('offline');
  const [isTyping, setIsTyping] = useState(false);
  const [headerActionLoading, setHeaderActionLoading] = useState<'reserve' | 'unreserve' | 'sold' | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  const isSeller = chat && userId === chat.sellerId;
  const isBuyer = chat && userId === chat.buyerId;
  const otherUser = chat ? (isSeller ? chat.buyer : chat.seller) : null;

  const productStatus: string | undefined = chat?.product?.status;
  const inputDisabledByGate = !!chat && !chat.firstMessageSent && !isSeller;

  const markAsRead = useCallback(() => {
    if (socket && isConnected) socket.emit('chat:read', { chatId });
  }, [socket, isConnected, chatId]);

  const fetchChatAndMessages = useCallback(async () => {
    try {
      const [chatDetail, msgs] = await Promise.all([
        api.getChatDetail(chatId),
        api.getChatMessages(chatId),
      ]);
      setChat(chatDetail);
      setMessages(msgs.reverse());
      markAsRead();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Sohbet yüklenemedi');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [chatId, markAsRead, navigation]);

  useEffect(() => {
    fetchChatAndMessages();
  }, [fetchChatAndMessages]);

  // Header
  useEffect(() => {
    if (!chat) return;
    navigation.setOptions({
      headerTitleAlign: 'center',
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser?.fullName || 'Sohbet'}
          </Text>
          <Text
            style={[
              styles.headerStatus,
              otherUserStatus === 'online' && styles.headerStatusOnline,
            ]}
          >
            {otherUserStatus === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
          </Text>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={openSecondaryMenu} style={styles.headerMore}>
          <Text style={styles.headerMoreText}>⋮</Text>
        </TouchableOpacity>
      ),
    });
  }, [chat, otherUser, otherUserStatus, navigation]);

  const openSecondaryMenu = () => {
    if (!chat || !otherUser) return;
    Alert.alert(otherUser.fullName, 'İşlem seçin', [
      { text: 'Profili Gör', onPress: () => navigation.navigate('UserProfile', { userId: otherUser.id }) },
      { text: 'Kullanıcıyı Engelle', style: 'destructive', onPress: confirmBlock },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const confirmBlock = () => {
    if (!otherUser) return;
    Alert.alert(
      'Kullanıcıyı Engelle',
      `${otherUser.fullName} engellenecek. Aranızdaki tüm aktif teklifler ve rezervasyonlar iptal olur. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.blockUser(otherUser.id);
              Alert.alert('Tamam', 'Kullanıcı engellendi.', [
                { text: 'Geri', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Engelleme başarısız');
            }
          },
        },
      ],
    );
  };

  // Socket
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('chat:join', chatId, (response: any) => {
      if (!response?.success) {
        Alert.alert('Hata', 'Sohbete katılılamadı');
        navigation.goBack();
      }
    });

    const handleNewMessage = (message: any) => {
      setMessages((prev) => [message, ...prev]);
      setChat((prev: any) =>
        prev ? { ...prev, firstMessageSent: prev.firstMessageSent || message.sender.id === prev.sellerId } : prev,
      );
      if (message.sender.id !== userId) markAsRead();
    };
    const handleTyping = () => {
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2500);
    };
    const handleError = (data: any) => {
      Alert.alert('Hata', data.message);
      setSending(false);
    };

    socket.on('chat:newMessage', handleNewMessage);
    socket.on('chat:userTyping', handleTyping);
    socket.on('chat:error', handleError);

    return () => {
      socket.emit('chat:leave', chatId);
      socket.off('chat:newMessage', handleNewMessage);
      socket.off('chat:userTyping', handleTyping);
      socket.off('chat:error', handleError);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, isConnected, chatId, userId, markAsRead, navigation]);

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

  const handleTyping = (text: string) => {
    setInputText(text);
    if (socket && isConnected && text.length > 0) {
      const now = Date.now();
      if (now - lastTypingEmitRef.current > 2000) {
        socket.emit('chat:typing', { chatId });
        lastTypingEmitRef.current = now;
      }
    }
  };

  const sendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !socket || !isConnected || sending) return;
    setSending(true);
    socket.emit('chat:send', { chatId, content: trimmed }, (response: any) => {
      setSending(false);
      if (response?.success) setInputText('');
      else Alert.alert('Hata', response?.error || 'Mesaj gönderilemedi');
    });
  };

  const handleReserve = async () => {
    if (!chat?.product?.id) return;
    setHeaderActionLoading('reserve');
    try {
      await api.reserveProduct(chat.product.id);
      setChat({ ...chat, product: { ...chat.product, status: 'reserved' } });
      Alert.alert('Tamam', 'Ürün rezerve edildi.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Rezerve edilemedi.');
    } finally {
      setHeaderActionLoading(null);
    }
  };

  const handleUnreserve = async () => {
    if (!chat?.product?.id) return;
    setHeaderActionLoading('unreserve');
    try {
      await api.unreserveProduct(chat.product.id);
      setChat({ ...chat, product: { ...chat.product, status: 'active' } });
      Alert.alert('Tamam', 'Ürün satışa geri açıldı.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız.');
    } finally {
      setHeaderActionLoading(null);
    }
  };

  const handleSold = async () => {
    if (!chat?.product?.id) return;
    Alert.alert('Satıldı olarak işaretle', 'Bu ürün artık satılmış olarak görünecek. Onaylıyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, satıldı',
        onPress: async () => {
          setHeaderActionLoading('sold');
          try {
            const result = await api.markProductSold(chat.product.id);
            setChat({ ...chat, product: { ...chat.product, status: 'sold' } });
            Alert.alert('Süper 🎉', 'Ürün satıldı olarak işaretlendi.');
            // Alıcının değerlendirme ekranı kendi tarafında bildirimle açılacak.
          } catch (error: any) {
            Alert.alert('Hata', error.message || 'İşlem başarısız.');
          } finally {
            setHeaderActionLoading(null);
          }
        },
      },
    ]);
  };

  // Alıcı: ürün satıldıysa ve değerlendirme yapılmadıysa Review'e git
  useEffect(() => {
    if (!chat || !isBuyer) return;
    if (productStatus !== 'sold') return;
    if (!chat.originOfferId) return;
    (async () => {
      try {
        const existing = await api.getReviewByOffer(chat.originOfferId).catch(() => null);
        if (!existing) {
          navigation.navigate('Review', {
            offerId: chat.originOfferId,
            sellerName: otherUser?.fullName,
            productTitle: chat.product?.title,
          });
        }
      } catch {
        // sessizce yut
      }
    })();
  }, [chat, isBuyer, productStatus, navigation, otherUser]);

  const renderMessage = useCallback(
    ({ item }: { item: any }) => {
      const isMyMessage = item.sender.id === userId;
      const time = new Date(item.createdAt).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return (
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}
          >
            {!isMyMessage && <Text style={styles.senderName}>{item.sender.fullName}</Text>}
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
              {time}
            </Text>
          </View>
        </View>
      );
    },
    [userId],
  );

  if (loading || !chat) {
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

      {/* Ürün şeridi + satıcı için satış aksiyonları */}
      {chat.product && (
        <View style={styles.productStrip}>
          <TouchableOpacity
            style={styles.productStripLeft}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductDetail', { productId: chat.product.id })}
          >
            {chat.product.images?.[0]?.imageUrl ? (
              <Image
                source={{ uri: getImageUrl(chat.product.images[0].imageUrl) }}
                style={styles.productThumb}
              />
            ) : (
              <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
                <Text>📦</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {chat.product.title}
              </Text>
              <Text style={styles.productPrice}>₺{chat.product.price}</Text>
              <Text style={styles.productStatus}>
                {productStatus === 'reserved' && '🔒 Rezerve'}
                {productStatus === 'sold' && '✅ Satıldı'}
                {productStatus === 'active' && 'Aktif'}
              </Text>
            </View>
          </TouchableOpacity>

          {isSeller && productStatus !== 'sold' && (
            <View style={styles.sellerActions}>
              {productStatus === 'reserved' ? (
                <TouchableOpacity
                  style={[styles.sellerBtn, styles.sellerBtnGhost]}
                  onPress={handleUnreserve}
                  disabled={headerActionLoading === 'unreserve'}
                >
                  {headerActionLoading === 'unreserve' ? (
                    <ActivityIndicator size="small" color="#5856D6" />
                  ) : (
                    <Text style={styles.sellerBtnGhostText}>Satışa Geri Dön</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.sellerBtn, styles.sellerBtnAccent]}
                  onPress={handleReserve}
                  disabled={headerActionLoading === 'reserve'}
                >
                  {headerActionLoading === 'reserve' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.sellerBtnAccentText}>Anlaşma Sağlandı</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.sellerBtn, styles.sellerBtnSold]}
                onPress={handleSold}
                disabled={headerActionLoading === 'sold'}
              >
                {headerActionLoading === 'sold' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.sellerBtnSoldText}>Satıldı</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={{ flex: 1 }}>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                {isSeller
                  ? 'İlk mesajı siz atın 👋'
                  : 'Satıcının ilk mesajı bekleniyor...'}
              </Text>
            </View>
          }
        />
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{otherUser?.fullName?.split(' ')[0]} yazıyor...</Text>
          </View>
        )}
      </View>

      {inputDisabledByGate ? (
        <View style={styles.gatedInputBar}>
          <Text style={styles.gatedInputText}>Satıcının ilk mesajı bekleniyor...</Text>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleTyping}
            placeholder="Mesajınız..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
            editable={!sending && isConnected && productStatus !== 'sold'}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending || !isConnected || productStatus === 'sold') &&
                styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending || !isConnected || productStatus === 'sold'}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.sendButtonText}>Gönder</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  offlineBanner: { backgroundColor: '#FF9500', paddingVertical: 6, alignItems: 'center' },
  offlineBannerText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  headerTitle: { alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '600', color: '#000' },
  headerStatus: { fontSize: 11, color: '#8E8E93' },
  headerStatusOnline: { color: '#34C759' },
  headerMore: { paddingHorizontal: 12 },
  headerMoreText: { fontSize: 22, color: '#007AFF' },

  productStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 8,
  },
  productStripLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  productThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F2F2F7' },
  productThumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  productPrice: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  productStatus: { fontSize: 11, color: '#8E8E93', marginTop: 2 },

  sellerActions: { flexDirection: 'row', gap: 6 },
  sellerBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sellerBtnAccent: { backgroundColor: '#5856D6' },
  sellerBtnAccentText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  sellerBtnGhost: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#5856D6' },
  sellerBtnGhostText: { color: '#5856D6', fontWeight: '700', fontSize: 12 },
  sellerBtnSold: { backgroundColor: '#34C759' },
  sellerBtnSoldText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

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
  myMessageTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  otherMessageTime: { color: '#8E8E93' },

  typingContainer: {
    position: 'absolute',
    bottom: 5,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typingText: { fontSize: 13, color: '#8E8E93', fontStyle: 'italic', fontWeight: '500' },

  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyMessagesText: { fontSize: 16, color: '#8E8E93', textAlign: 'center', paddingHorizontal: 32 },

  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  sendButtonDisabled: { backgroundColor: '#C7C7CC' },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  gatedInputBar: {
    padding: 18,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  gatedInputText: { color: '#8E8E93', fontStyle: 'italic', fontWeight: '500' },
});
