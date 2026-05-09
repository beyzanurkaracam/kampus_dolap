import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import api from '../../services/api';

export const ReviewScreen = ({ route, navigation }: any) => {
  const { offerId, sellerName, productTitle } = route.params;
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      Alert.alert('Uyarı', 'Lütfen 1-5 arası bir yıldız seçin.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createReview({ offerId, rating, comment: comment.trim() || undefined });
      Alert.alert('Teşekkürler 🌟', 'Değerlendirmeniz kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Değerlendirme gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Satıcıyı Değerlendir</Text>
        {sellerName && <Text style={styles.subtitle}>{sellerName}</Text>}
        {productTitle && <Text style={styles.product}>📦 {productTitle}</Text>}

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
              <Text style={[styles.star, n <= rating && styles.starActive]}>
                {n <= rating ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Yorum (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Alışveriş deneyimini birkaç cümleyle anlat"
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={500}
        />
        <Text style={styles.counter}>{comment.length}/500</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (submitting || rating < 1) && styles.buttonDisabled]}
          onPress={submit}
          disabled={submitting || rating < 1}
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
