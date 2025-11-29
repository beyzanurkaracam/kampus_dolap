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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';


const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';


const API_URL = `${BASE_URL}/auth`;

export const EmailVerificationScreen = ({ route, navigation }: any) => {
  const { email, fullName } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Hata', 'Lütfen 6 haneli doğrulama kodunu giriniz');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/verify-email`, {
        email,
        code,
      });

      // Token'ı kaydet
      await AsyncStorage.setItem('userToken', response.data.access_token);
      await AsyncStorage.setItem('userType', 'user');

      const userName = response.data.user?.fullName || fullName;
      const universityName = response.data.user?.university?.name || '';

      Alert.alert('Başarılı', `Hoş geldin ${userName}!\n${universityName}`, [
        {
          text: 'Tamam',
          onPress: () => navigation.navigate('UserHome'),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Doğrulama Hatası',
        error.response?.data?.message || 'Kod doğrulanamadı',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await axios.post(`${API_URL}/resend-code`, { email });
      Alert.alert('Başarılı', 'Yeni doğrulama kodu gönderildi');
    } catch (error: any) {
      Alert.alert(
        'Hata',
        error.response?.data?.message || 'Kod gönderilemedi',
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>📧 Email Doğrulama</Text>
        
        <Text style={styles.description}>
          {email} adresine gönderilen 6 haneli doğrulama kodunu giriniz
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="_ _ _ _ _ _"
          placeholderTextColor="#999"
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
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
          <Text style={styles.backButtonText}>← Geri Dön</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Console'da gösterilen kodu kullanabilirsiniz
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  codeInput: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
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
    marginBottom: 20,
  },
  resendText: {
    color: '#666',
    marginRight: 10,
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
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    color: '#2e7d32',
    fontSize: 14,
    textAlign: 'center',
  },
});
