import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
// 👑 Mimari kurallara uyuyoruz: axios yerine kendi güvenli api servisimizi kullanıyoruz!
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext'; 

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { checkAuth } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [detectedUniversity, setDetectedUniversity] = useState<string>('');

  const validateEmail = (emailStr: string) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.(edu|ac)\.[a-z]{2,}$/i;
    const eduPattern = /^[^\s@]+@[^\s@]+\.edu$/i;
    return emailPattern.test(emailStr) || eduPattern.test(emailStr);
  };

  // 👑 SENIOR DOKUNUŞU: Debounce (Spam Engelleme) Mekanizması
  // Kullanıcı her harf yazdığında değil, yazmayı bitirince API'ye gider.
  useEffect(() => {
    const checkUniversity = async () => {
      const trimmedEmail = email.trim();
      
      if (validateEmail(trimmedEmail)) {
        try {
          // api.ts içindeki detectUniversity metodunu çağırıyoruz
          const response = await api.detectUniversity(trimmedEmail);
          
          // Axios olmadığı için response.data yerine direkt response kullanıyoruz
          if (response?.success) {
            setDetectedUniversity(response.university?.name || '');
            setDepartments(response.departments || []);
          }
        } catch (error) {
          console.log('Üniversite tespit hatası:', error);
        }
      } else {
        setDetectedUniversity('');
        setDepartments([]);
        setDepartment('');
      }
    };

    // 600ms bekleme süresi
    const delayDebounceFn = setTimeout(() => {
      if (email) checkUniversity();
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [email]); // Sadece email değiştiğinde tetiklenir

  const selectDepartment = (dept: string) => {
    setDepartment(dept);
    setShowDepartmentModal(false);
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim();

    if (!fullName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurunuz');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert(
        'Email Hatası',
        'Lütfen geçerli bir üniversite email adresi kullanınız (.edu, .edu.tr vb.)'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Şifre Hatası', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Şifre Hatası', 'Şifre en az 6 karakter olmalı');
      return;
    }

    setLoading(true);
    try {
      // 👑 Kendi yazdığımız api.register fonksiyonunu kullanıyoruz
      const response = await api.register({
        email: trimmedEmail,
        password,
        fullName,
        department: department || undefined,
        phone: phone || undefined,
      });

      // Backend'in dönüş yapısına göre email doğrulama kontrolü
      if (response && (response as any).requiresVerification) {
        // Email doğrulama gerekiyorsa o ekrana yönlendir
        Alert.alert(
          'Kayıt Başarılı',
          'Email adresinize gönderilen doğrulama kodunu giriniz',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.navigate('EmailVerification', {
                email: trimmedEmail,
                fullName: fullName,
              }),
            },
          ]
        );
      } else {
        // 👑 SENIOR DOKUNUŞU: Doğrulama gerekmiyorsa Trafik Polisine haber ver!
        console.log('📝 Doğrulama gerekmiyorsa, checkAuth çağrılıyor...');
        await checkAuth();
        // checkAuth çalışınca isLoggedIn true olacak
        // App.tsx seni otomatik UserHome'a yönlendirecek!
      }
    } catch (error: any) {
      Alert.alert(
        'Kayıt Hatası',
        error.message || 'Kayıt yapılamadı'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    // 👑 Klavye açıldığında inputların kapanmasını engeller
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Geri Dön</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Hesap Oluştur</Text>

        <TextInput
          style={styles.input}
          placeholder="Ad Soyad"
          placeholderTextColor="#999"
          value={fullName}
          onChangeText={setFullName}
          textContentType="name"
          autoCapitalize="words" // Her kelimenin baş harfi büyük
        />

        <TextInput
          style={styles.input}
          placeholder="Email (üniversite maili)"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail} // Sadece state güncellenir, API call useEffect'te!
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoCorrect={false}
        />

        {detectedUniversity ? (
          <View style={styles.universityInfo}>
            <Text style={styles.universityInfoText}>
               {detectedUniversity}
            </Text>
          </View>
        ) : null}

        {departments.length > 0 ? (
          <TouchableOpacity
            style={styles.departmentSelector}
            onPress={() => setShowDepartmentModal(true)}
            activeOpacity={0.8}
          >
            <Text style={department ? styles.departmentSelected : styles.departmentPlaceholder}>
              {department || 'Bölüm Seç (opsiyonel)'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        ) : null}

        {!departments.length && detectedUniversity ? (
          <TextInput
            style={styles.input}
            placeholder="Bölüm (manuel giriş)"
            placeholderTextColor="#999"
            value={department}
            onChangeText={setDepartment}
            textContentType="none"
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Telefon (opsiyonel)"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifreyi Onayla"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
             Sadece üniversite email adresi ile kayıt yapabilirsiniz
          </Text>
          <Text style={styles.infoText}>
             Örnek: isim@sabanciuniv.edu, isim@sakarya.edu.tr
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.registerButton, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>

        {/* Bölüm Seçim Modal */}
        <Modal
          visible={showDepartmentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDepartmentModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bölüm Seç</Text>
                <TouchableOpacity onPress={() => setShowDepartmentModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={departments}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.departmentItem}
                    onPress={() => selectDepartment(item)}
                  >
                    <Text style={styles.departmentItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.departmentList}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
    marginBottom: 20,
    marginTop: 10,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12, // Biraz daha modern yuvarlaklık
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  universityInfo: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  universityInfoText: {
    color: '#2e7d32',
    fontSize: 15,
    fontWeight: '600',
  },
  departmentSelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departmentPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  departmentSelected: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownIcon: {
    color: '#007AFF',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    color: '#1976d2',
    fontSize: 14,
    marginBottom: 4,
  },
  registerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40, // Scroll için alttan boşluk
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
    paddingHorizontal: 10,
  },
  departmentList: {
    maxHeight: 500,
  },
  departmentItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  departmentItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default RegisterScreen;