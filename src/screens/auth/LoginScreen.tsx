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
  const [userType, setUserType] = useState<'user' | 'admin'>('user');

  const handleLogin = async () => {
    const trimmedEmail = email.trim(); // Boşlukları temizle
    
    if (!trimmedEmail || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz');
      return;
    }

    setLoading(true);
    try {
      // 1. Sadece Context'e "Giriş yap" diyoruz.
      await login(trimmedEmail, password, userType);
      
      // 2. BAŞKA HİÇBİR ŞEY YAPMIYORUZ! Yönlendirmeyi App.tsx otomatik yapacak.
      
    } catch (error: any) {
      Alert.alert('Giriş Hatası', error.message || 'Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  // ✅ TEST VERİLERİNİ DOLDURAN FONKSİYON
  const fillTestUser = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setUserType('user'); // Genelde testler user ile yapılır
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>2.el Satış Platformu</Text>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            userType === 'user' && styles.typeButtonActive,
          ]}
          onPress={() => setUserType('user')}
        >
          <Text style={styles.typeButtonText}>Kullanıcı</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            userType === 'admin' && styles.typeButtonActive,
          ]}
          onPress={() => setUserType('admin')}
        >
          <Text style={styles.typeButtonText}>Admin</Text>
        </TouchableOpacity>
      </View>

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

      {userType === 'user' && (
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLink}>Hesabın yok mu? Kaydol</Text>
        </TouchableOpacity>
      )}

      {/* SADECE GELİŞTİRME MODUNDA GÖRÜNEN HIZLI GİRİŞ PANELİ */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}> Hızlı Test Girişi</Text>
            <View style={styles.debugButtons}>
                <TouchableOpacity 
                    style={[styles.debugButton, { backgroundColor: '#FF9500' }]}
                    onPress={() => fillTestUser('tarik.kalyoncu@ogr.sakarya.edu.tr', '267453')}
                >
                    <Text style={styles.debugButtonText}>Tarık (Alıcı)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.debugButton, { backgroundColor: '#5856D6' }]}
                    onPress={() => fillTestUser('beyzanur.karacam@ogr.sakarya.edu.tr', '267453')}
                >
                    <Text style={styles.debugButtonText}>Beyza (Satıcı)</Text>
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
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
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