
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';

// ── TİP TANIMLAMALARI ──
interface NotificationSender {
  id: string;
  fullName: string;
  profilePhoto?: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
  referenceType?: string;
  sender: NotificationSender | null;
}

// ── ZAMAN FORMATLAYICI ──
const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHour < 24) return `${diffHour} sa önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

// ── BİLDİRİM TİPİNE GÖRE İKON ──
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'comment':        return '';
    case 'comment_reply':  return '';
    case 'offer':          return '';
    case 'offer_accepted': return '';
    case 'offer_rejected': return '';
    case 'meeting_confirmed': return '';
    case 'follow':         return '';
    default:               return '';
  }
};

export const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ── VERİ ÇEKME ──
  const fetchNotifications = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      const response = await api.getNotifications(pageNum, 20);
      
      if (isRefresh || pageNum === 1) {
        setNotifications(response.notifications);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
      }
      
      setHasMore(response.notifications.length === 20);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Bildirimler yüklenemedi:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── SAYFA AÇILDIĞINDA: Verileri çek + tümünü okundu yap ──
  useEffect(() => {
    fetchNotifications(1);

    // Sayfa açıldığı an tüm bildirimleri "okundu" olarak işaretle
    api.markAllNotificationsAsRead().catch(err => 
      console.error('Okundu işaretleme hatası:', err)
    );
  }, [fetchNotifications]);

  // ── BİLDİRİME TIKLANDIĞINDA YÖNLENDİRME ──
  const handleNotificationPress = (item: NotificationItem) => {
    if (item.referenceType === 'product' && item.referenceId) {
      navigation.navigate('ProductDetail', { productId: item.referenceId });
    } else if (item.referenceType === 'offer' && item.referenceId) {
      navigation.navigate('Offers');
    }
  };

  // ── YENİLE ──
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(1, true);
    api.markAllNotificationsAsRead().catch(() => {});
  }, [fetchNotifications]);

  // ── DAHA FAZLA YÜKLE ──
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchNotifications(page + 1);
    }
  };

  // ── TEK BİLDİRİM KARTI ──
  const renderNotification = useCallback(({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      activeOpacity={0.7}
      onPress={() => handleNotificationPress(item)}
    >
      {/* Sol: İkon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      </View>

      {/* Orta: İçerik */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        {item.sender && (
          <Text style={styles.senderName}>{item.sender.fullName}</Text>
        )}
      </View>

      {/* Sağ: Okunmamış noktası */}
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  ), []);

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
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={10}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
            <Text style={styles.emptySubtext}>
              Ürünlerinize yorum yapıldığında, teklif geldiğinde veya takip edildiğinizde burada göreceksiniz.
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore && notifications.length > 0 ? (
            <ActivityIndicator style={{ padding: 20 }} color="#007AFF" />
          ) : null
        }
      />
    </View>
  );
};

// ── STİLLER ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12 },

  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 20 },

  contentContainer: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  time: { fontSize: 12, color: '#8E8E93' },
  message: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 19,
    marginBottom: 2,
  },
  senderName: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});