import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView, // 👑 Klavye UX'i için eklendi
  ScrollView,
} from 'react-native';
// 👑 Mimari kural: Sadece kendi güvenli API ve Context'imizi kullanıyoruz!
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const EmailVerificationScreen = ({ route, navigation }: any) => {
  const { email, fullName } = route.params;
  // 👑 Trafik Polisimizi çağırıyoruz
  const { checkAuth } = useAuth(); 

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    const cleanCode = code.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      Alert.alert('Hata', 'Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz');
      return;
    }

    setLoading(true);
    try {
      // 👑 Kendi yazdığımız güvenli api metodunu kullanıyoruz
      const response = await api.verifyEmail(email, cleanCode);

      const userName = response.user?.fullName || fullName;
      // Backend university alanını nesne veya string dönebilir, ona göre önlem alıyoruz
      const universityName = typeof response.user?.university === 'object' 
        ? (response.user.university as any)?.name 
        : response.user?.university || '';

      Alert.alert(
        'Başarılı', 
        `Hoş geldin ${userName}!\n${universityName}`, 
        [
          {
            text: 'Tamam',
            onPress: async () => {
              // 👑 KRİTİK: Manuel yönlendirme YOK! Polise haber veriyoruz.
              // checkAuth çalışınca token'ı algılayacak ve bizi otomatik içeri alacak.
              await checkAuth(); 
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Doğrulama Hatası',
        error.message || 'Kod doğrulanamadı'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      // 👑 Güvenli API çağrısı
      await api.resendVerificationCode(email);
      Alert.alert('Başarılı', 'Yeni doğrulama kodu email adresinize gönderildi.');
    } catch (error: any) {
      Alert.alert(
        'Hata',
        error.message || 'Kod gönderilemedi. Lütfen daha sonra tekrar deneyin.'
      );
    } finally {
      setResending(false);
    }
  };

  // Sadece rakam girilmesini garanti altına alıyoruz
  const handleCodeChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue.length <= 6) {
      setCode(numericValue);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>📧 Email Doğrulama</Text>
          
          <Text style={styles.description}>
            <Text style={styles.boldEmail}>{email}</Text> adresine gönderilen 6 haneli doğrulama kodunu giriniz.
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder="• • • • • •"
            placeholderTextColor="#999"
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            textContentType="oneTimeCode" // 👑 iOS için SMS okuma/yapıştırma desteği
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Doğrula</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Kod gelmedi mi?</Text>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={styles.resendButton}>Yeniden Gönder</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Email'i Değiştir</Text>
          </TouchableOpacity>

          {__DEV__ && ( // Sadece geliştirme (development) modunda bu kutu görünür
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Geliştirici Notu: Kodu backend console log'undan alabilirsiniz.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  boldEmail: {
    fontWeight: 'bold',
    color: '#333',
  },
  codeInput: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 25,
    color: '#333',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  resendText: {
    color: '#666',
    marginRight: 10,
    fontSize: 15,
  },
  resendButton: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    padding: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    color: '#2e7d32',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});