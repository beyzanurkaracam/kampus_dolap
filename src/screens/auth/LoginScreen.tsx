import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
    } catch (error: any) {
      Alert.alert('Giriş Hatası', error.message || 'Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  const fillTestUser = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>2.el Satış Platformu</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Şifre"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>Giriş Yap</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerLink}>Hesabın yok mu? Kaydol</Text>
      </TouchableOpacity>

      {/* SADECE GELİŞTİRME MODUNDA GÖRÜNEN HIZLI GİRİŞ PANELİ */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}> Hızlı Test Girişi</Text>
            <View style={styles.debugButtons}>
                <TouchableOpacity 
                    style={[styles.debugButton, { backgroundColor: '#FF9500' }]}
                    onPress={() => fillTestUser('tarik.kalyoncu@ogr.sakarya.edu.tr', 'Galatasaray53-')}
                >
                    <Text style={styles.debugButtonText}>Tarık-Alıcı</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.debugButton, { backgroundColor: '#5856D6' }]}
                    onPress={() => fillTestUser('beyzanur.karacam@ogr.sakarya.edu.tr', 'Beyza5358')}
                >
                    <Text style={styles.debugButtonText}>Beyza-Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.debugButton, { backgroundColor: '#5856D6' }]}
                    onPress={() => fillTestUser('kenan.yaylacık@ogr.sakarya.edu.tr', 'Beyza5358')}
                >
                    <Text style={styles.debugButtonText}>Kenan-Alıcı</Text>
                </TouchableOpacity>
            </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },
  
  // ✅ DEBUG STİLLERİ
  debugContainer: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#e1e1e1',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed'
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center'
  },
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  debugButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  debugButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  }
});

export default LoginScreen;