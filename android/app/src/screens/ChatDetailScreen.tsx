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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:3000';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; fullName: string };
  isRead: boolean;
}

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

  // Header'ı güncelle
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

  // Mesajları yükle
  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Sohbete katıl
    socket.emit('chat:join', chatId, (response: any) => {
      if (!response?.success) {
        Alert.alert('Hata', 'Sohbete katılılamadı');
        navigation.goBack();
      }
    });

    // Yeni mesaj geldiğinde
    socket.on('chat:newMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      
      // Eğer karşı taraftan geldiyse okundu işaretle
      if (message.sender.id !== userId) {
        markAsRead();
      }
    });

    // Karşı taraf yazıyor
    socket.on('chat:userTyping', () => {
      setIsTyping(true);
      
      // 3 saniye sonra kaldır
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    });

    // Hata mesajı
    socket.on('chat:error', (data: any) => {
      Alert.alert('Hata', data.message);
      setSending(false);
    });

    // Cleanup
    return () => {
      socket.emit('chat:leave', chatId);
      socket.off('chat:newMessage');
      socket.off('chat:userTyping');
      socket.off('chat:error');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, isConnected, chatId]);

  // Online status kontrolü
  useEffect(() => {
    if (!socket || !isConnected || !otherUser) return;

    const checkStatus = () => {
      socket.emit('user:status', otherUser.id, (response: any) => {
        if (response?.success) {
          setOtherUserStatus(response.data.status);
        }
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // 15 saniyede bir

    return () => clearInterval(interval);
  }, [socket, isConnected, otherUser]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(response.data);
      setTimeout(scrollToBottom, 100);
      
      // Mesajları okundu işaretle
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
    
    if (!trimmedText || !socket || !isConnected) return;
    if (sending) return;

    setSending(true);

    socket.emit('chat:send', {
      chatId,
      content: trimmedText,
    }, (response: any) => {
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
    
    // Typing indicator gönder
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
    const messageTime = new Date(item.createdAt);

    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isMyMessage && (
          <Text style={styles.senderName}>{item.sender.fullName}</Text>
        )}
        <Text style={[
          styles.messageText,
          isMyMessage && styles.myMessageText
        ]}>
          {item.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isMyMessage && styles.myMessageTime
          ]}>
            {messageTime.toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMyMessage && item.isRead && (
            <Text style={styles.readIndicator}>✓✓</Text>
          )}
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
      {/* Connection Status */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚠️ Bağlantı kuruluyor...
          </Text>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyMessagesText}>
              Henüz mesaj yok. İlk mesajı gönderin! 👋
            </Text>
          </View>
        }
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>Yazıyor...</Text>
        </View>
      )}

      {/* Input Container */}
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
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>Gönder</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerProductTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  headerStatus: {
    fontSize: 11,
    color: '#8E8E93',
  },
  headerStatusOnline: {
    color: '#34C759',
  },
  offlineBanner: {
    backgroundColor: '#FF9500',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  myMessageText: {
    color: '#FFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readIndicator: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
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
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});