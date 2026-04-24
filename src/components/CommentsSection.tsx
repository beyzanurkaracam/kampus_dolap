// src/components/CommentsSection.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── TİP TANIMLAMALARI ──
interface CommentAuthor {
  id: string;
  fullName: string;
  profilePhoto?: string;
}

interface CommentData {
  id: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  author: CommentAuthor | null;
  threadStarterId: string;
  sellerId: string;
  parentId: string | null;
  canReply: boolean;
  canDelete: boolean;
  replies: CommentData[];
}

interface CommentsSectionProps {
  productId: string;
  sellerId: string; // Ürün sahibi
}

// ── ANA KOMPONENT ──
export const CommentsSection: React.FC<CommentsSectionProps> = ({
  productId,
  sellerId,
}) => {
  const { userId } = useAuth();

  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  // Yanıt modu: hangi yoruma yanıt veriliyor
  const [replyTarget, setReplyTarget] = useState<{
    id: string;
    authorName: string;
  } | null>(null);

  const isOwner = userId === sellerId;

  // ── Yorumları Çek ──
  const fetchComments = useCallback(async () => {
    try {
      const data = await api.getProductComments(productId);
      setComments(data);
    } catch (error: any) {
      console.error('Yorumlar yüklenemedi:', error.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ── Yorum / Yanıt Gönder ──
  const handleSend = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    if (trimmed.length < 2) {
      Alert.alert('Uyarı', 'Yorum en az 2 karakter olmalıdır.');
      return;
    }
    if (trimmed.length > 300) {
      Alert.alert('Uyarı', 'Yorum en fazla 300 karakter olabilir.');
      return;
    }

    setSending(true);
    try {
      if (replyTarget) {
        await api.replyToComment(replyTarget.id, trimmed);
      } else {
        await api.createComment(productId, trimmed);
      }

      setNewComment('');
      setReplyTarget(null);
      await fetchComments();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Yorum gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  // ── Yorum Sil ──
  const handleDelete = (commentId: string) => {
    Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteComment(commentId);
            await fetchComments();
          } catch (error: any) {
            Alert.alert('Hata', error.message || 'Yorum silinemedi.');
          }
        },
      },
    ]);
  };

  // ── Zaman Formatlayıcı ──
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk`;
    if (diffHour < 24) return `${diffHour} sa`;
    if (diffDay < 7) return `${diffDay} gün`;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // ── Tek Yorum Kartı (Recursive) ──
  // ── Tek Yorum Kartı (Recursive) ──
 // ── Tek Yorum Kartı (Recursive) ──
 const renderComment = (comment: CommentData, depth: number = 0) => {
    const isSeller = comment.author?.id === comment.sellerId;
    const maxIndent = Math.min(depth, 3); // İç içe yanıtlarda girinti limiti

    return (
      <View key={comment.id}>
        {/* Yorumun Kendisi */}
        <View style={[styles.commentRow, { marginLeft: maxIndent * 35 }]}>
          {/* Sol: Avatar */}
          <View style={[styles.avatar, isSeller && styles.sellerAvatar]}>
            <Text style={styles.avatarText}>
              {comment.author?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>

          {/* Sağ: İsim, Yorum ve Aksiyonlar */}
          <View style={styles.contentColumn}>
            
            {/* İsim ve İçerik Yan Yana */}
            <Text style={styles.commentBody}>
              <Text style={styles.authorName}>{comment.author?.fullName || 'Anonim'} </Text>
              {/* Boolean çökmesini önlemek için ternary (? : null) kullandık */}
              {isSeller ? <Text style={styles.sellerTag}>Satıcı </Text> : null}
              <Text style={styles.commentText}>{comment.content}</Text>
            </Text>

            {/* Alt Satır: Zaman, Yanıtla, Sil */}
            <View style={styles.actionRow}>
              <Text style={styles.timeText}>{formatTime(comment.createdAt)}</Text>
              
              {comment.canReply && (
                <TouchableOpacity
                  onPress={() =>
                    setReplyTarget({
                      id: comment.id,
                      authorName: comment.author?.fullName || 'Kullanıcı',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>Yanıtla</Text>
                </TouchableOpacity>
              )}

              {comment.canDelete && (
                <TouchableOpacity
                  onPress={() => handleDelete(comment.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>Sil</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Alt Yanıtlar (Recursive) - commentRow'un İÇİNE DEĞİL, ALTINA yerleştirdik! */}
        {comment.replies && comment.replies.length > 0 ? (
          <View>
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </View>
        ) : null}
      </View>
    );
  };

  // ── ANA RENDER ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Sorular & Yorumlar ({comments.length})
        </Text>
        {!isOwner && (
          <Text style={styles.privacyHint}>
            Yorumunuz satıcı yanıt verene kadar gizlidir
          </Text>
        )}
      </View>

      {/* Yorum Listesi */}
      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>
            Henüz yorum yok. İlk soruyu siz sorun!
          </Text>
        </View>
      ) : (
        comments.map((comment) => renderComment(comment, 0))
      )}

      {/* Yorum Giriş Alanı */}
      {userId && !isOwner && (
        <View style={styles.inputSection}>
          {/* Yanıt hedefi göstergesi */}
          {replyTarget && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>
                {replyTarget.authorName} kullanıcısına yanıt veriyorsunuz
              </Text>
              <TouchableOpacity onPress={() => setReplyTarget(null)}>
                <Text style={styles.replyCancel}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder={
                replyTarget ? 'Yanıtınızı yazın...' : 'Soru veya yorum yazın...'
              }
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!newComment.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.sendButtonText}>Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.charCount}>
            {newComment.length}/500
          </Text>
        </View>
      )}

      {/* Satıcı ise sadece gelen yorumlara yanıt verebileceğini belirt */}
      {userId && isOwner && comments.length > 0 && (
        <View style={styles.ownerHint}>
          <Text style={styles.ownerHintText}>
            Gelen yorumlardaki "Yanıtla" butonuyla cevap verebilirsiniz.
            Yanıt verdiğinizde yorum herkese açık hale gelir.
          </Text>
        </View>
      )}

      {/* Satıcı ise ve yanıt modu aktifse input göster */}
      {userId && isOwner && replyTarget && (
        <View style={styles.inputSection}>
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              {replyTarget.authorName} kullanıcısına yanıt veriyorsunuz
            </Text>
            <TouchableOpacity onPress={() => setReplyTarget(null)}>
              <Text style={styles.replyCancel}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Yanıtınızı yazın..."
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={500}
              editable={!sending}
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!newComment.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.sendButtonText}>Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ── STİLLER ──
const styles = StyleSheet.create({
    container: {
      backgroundColor: '#FFF',
      padding: 16,
      marginBottom: 8,
    },
    loadingContainer: {
      padding: 30,
      alignItems: 'center',
    },
  
    // Başlık
    sectionHeader: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#000',
      marginBottom: 4,
    },
    privacyHint: {
      fontSize: 12,
      color: '#8E8E93',
      fontStyle: 'italic',
    },
  
    // Boş durum
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    emptyIcon: {
      fontSize: 36,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: '#8E8E93',
    },
  
    // ── YENİ YORUM KARTI STİLLERİ (Sade, Metin Odaklı) ──
    commentRow: {
        flexDirection: 'row',
        marginBottom: 16,
        // paddingHorizontal'ı sildik çünkü marginLeft işlemi halledecek
      },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#C7C7CC', // Daha soft bir gri
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      marginTop: 2, // Metinle hizalamak için
    },
    sellerAvatar: {
      backgroundColor: '#34C759', // Sadece satıcı ayrışsın
    },
    avatarText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    contentColumn: {
      flex: 1,
    },
    commentBody: {
      lineHeight: 18,
    },
    authorName: {
      fontSize: 14,
      fontWeight: '700',
      color: '#262626', // Tam siyah değil, yumuşak siyah
    },
    sellerTag: {
      fontSize: 12,
      color: '#34C759',
      fontWeight: '700',
    },
    privateTag: {
      fontSize: 12,
      color: '#FF9500',
      fontWeight: '600',
    },
    commentText: {
      fontSize: 14,
      color: '#262626',
    },
    
    // ── ALT AKSİYON SATIRI (Zaman, Yanıtla, Sil) ──
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 16,
    },
    timeText: {
      fontSize: 12,
      color: '#8E8E93',
    },
    actionButtonText: {
      fontSize: 12,
      color: '#8E8E93',
      fontWeight: '600',
    },
    repliesContainer: {
      marginTop: 12,
    },
  
    // Input Bölümü
    inputSection: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#E5E5EA',
      paddingTop: 12,
    },
    replyIndicator: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#E5F1FF',
      padding: 10,
      borderRadius: 8,
      marginBottom: 8,
    },
    replyIndicatorText: {
      fontSize: 13,
      color: '#007AFF',
      fontWeight: '500',
      flex: 1,
    },
    replyCancel: {
      fontSize: 18,
      color: '#8E8E93',
      paddingLeft: 10,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: '#F2F2F7',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      maxHeight: 80,
      color: '#000',
    },
    sendButton: {
      backgroundColor: '#007AFF',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: '#C7C7CC',
    },
    sendButtonText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    charCount: {
      fontSize: 11,
      color: '#C7C7CC',
      textAlign: 'right',
      marginTop: 4,
    },
  
    // Satıcı İpucu
    ownerHint: {
      backgroundColor: '#F0F8FF',
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
      borderLeftWidth: 3,
      borderLeftColor: '#007AFF',
    },
    ownerHintText: {
      fontSize: 12,
      color: '#007AFF',
      lineHeight: 18,
    },
  });
