import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type RootStackParamList = {
  Review: {
    offerId: string;
    sellerName?: string;
    productTitle?: string;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_COMMENT_LENGTH = 500;
const STAR_COUNT = 5;

// ─── StarRating ───────────────────────────────────────────────────────────────

interface StarRatingProps {
  rating: number;
  onRate: (value: number) => void;
}

const StarRating = memo(({ rating, onRate }: StarRatingProps) => (
  <View style={styles.starsRow}>
    {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((n) => (
      <TouchableOpacity
        key={n}
        onPress={() => onRate(n)}
        activeOpacity={0.7}
        accessibilityLabel={`${n} yıldız`}
        accessibilityRole="button"
      >
        <Text style={[styles.star, n <= rating && styles.starActive]}>
          {n <= rating ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useReviewSubmit(offerId: string, onSuccess: () => void) {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (rating: number, comment: string) => {
      if (rating < 1) {
        Alert.alert('Uyarı', 'Lütfen 1-5 arası bir yıldız seçin.');
        return;
      }

      setSubmitting(true);
      try {
        await api.createReview({
          offerId,
          rating,
          comment: comment.trim() || undefined,
        });
        Alert.alert('Teşekkürler', 'Değerlendirmeniz kaydedildi.', [
          { text: 'Tamam', onPress: onSuccess },
        ]);
      } catch (error: any) {
        Alert.alert('Hata', error?.message ?? 'Değerlendirme gönderilemedi.');
      } finally {
        setSubmitting(false);
      }
    },
    [offerId, onSuccess],
  );

  return { submitting, submit };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export const ReviewScreen = ({ route, navigation }: Props) => {
  const { offerId, sellerName, productTitle } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSuccess = useCallback(() => navigation.goBack(), [navigation]);
  const { submitting, submit } = useReviewSubmit(offerId, handleSuccess);

  const isDisabled = submitting || rating < 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Satıcıyı Değerlendir</Text>
        {sellerName && <Text style={styles.subtitle}>{sellerName}</Text>}
        {productTitle && <Text style={styles.product}>📦 {productTitle}</Text>}

        <StarRating rating={rating} onRate={setRating} />

        <Text style={styles.label}>Yorum (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Alışveriş deneyimini birkaç cümleyle anlat"
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={MAX_COMMENT_LENGTH}
        />
        <Text style={styles.counter}>
          {comment.length}/{MAX_COMMENT_LENGTH}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, isDisabled && styles.buttonDisabled]}
          onPress={() => submit(rating, comment)}
          disabled={isDisabled}
          accessibilityLabel="Değerlendirmeyi gönder"
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Değerlendirmeyi Gönder</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#3C3C43', textAlign: 'center', marginBottom: 4 },
  product: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 24 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 32, gap: 8 },
  star: { fontSize: 48, color: '#C7C7CC' },
  starActive: { color: '#FFB800' },
  label: { fontSize: 14, color: '#3C3C43', marginBottom: 8, fontWeight: '500' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#000',
    textAlignVertical: 'top',
  },
  counter: { textAlign: 'right', color: '#8E8E93', fontSize: 12, marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#C7C7CC' },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
