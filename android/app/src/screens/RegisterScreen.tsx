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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';



const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

  
const API_URL = `${BASE_URL}/auth`;
const UNIVERSITY_API_URL = 'http://10.0.2.2:3000/university';

export const RegisterScreen = ({ navigation }: any) => {
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

  const validateEmail = (email: string) => {
    // Üniversite email formatı kontrolü (.edu, .edu.tr, .ac.uk vb.)
    const emailPattern = /^[^\s@]+@[^\s@]+\.(edu|ac)\.[a-z]{2,}$/i;
    const eduPattern = /^[^\s@]+@[^\s@]+\.edu$/i;
    return emailPattern.test(email) || eduPattern.test(email);
  };

  // Email değiştiğinde üniversiteyi tespit et ve bölümleri getir
  const handleEmailChange = async (emailValue: string) => {
    setEmail(emailValue);
    setDepartment(''); // Email değiştiğinde bölümü sıfırla
    setDepartments([]);
    setDetectedUniversity('');
    
    // Email geçerliyse üniversiteyi tespit et
    if (validateEmail(emailValue)) {
      try {
        const response = await axios.get(`${API_URL}/detect-university`, {
          params: { email: emailValue }
        });

        if (response.data.success) {
          const universityName = response.data.university?.name;
          const depts = response.data.departments || [];
          
          setDetectedUniversity(universityName);
          setDepartments(depts);
        }
      } catch (error) {
        console.log('Üniversite tespit hatası:', error);
      }
    }
  };

  const selectDepartment = (dept: string) => {
    setDepartment(dept);
    setShowDepartmentModal(false);
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(
        'Email Hatası',
        'Lütfen geçerli bir üniversite email adresi kullanınız (.edu, .edu.tr, .ac.uk vb.)',
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
      const response = await axios.post(`${API_URL}/register`, {
        email,
        password,
        fullName,
        department: department || undefined,
        phone: phone || undefined,
      });

      // Kayıt başarılı - email doğrulama ekranına git
      if (response.data.requiresVerification) {
        Alert.alert(
          'Kayıt Başarılı',
          'Email adresinize gönderilen doğrulama kodunu giriniz',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.navigate('EmailVerification', {
                email: response.data.email,
                fullName: fullName,
              }),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Kayıt Hatası',
        error.response?.data?.message || 'Kayıt yapılamadı',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
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
      />

      <TextInput
        style={styles.input}
        placeholder="Email (üniversite maili)"
        placeholderTextColor="#999"
        value={email}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {detectedUniversity && (
        <View style={styles.universityInfo}>
          <Text style={styles.universityInfoText}>
            ✅ {detectedUniversity}
          </Text>
        </View>
      )}

      {departments.length > 0 && (
        <TouchableOpacity
          style={styles.departmentSelector}
          onPress={() => setShowDepartmentModal(true)}
        >
          <Text style={department ? styles.departmentSelected : styles.departmentPlaceholder}>
            {department || 'Bölüm Seç (opsiyonel)'}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>
      )}

      {!departments.length && detectedUniversity && (
        <TextInput
          style={styles.input}
          placeholder="Bölüm (manuel giriş)"
          placeholderTextColor="#999"
          value={department}
          onChangeText={setDepartment}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Telefon (opsiyonel)"
        placeholderTextColor="#999"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Şifre"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Şifreyi Onayla"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🎓 Sadece üniversite email adresi ile kayıt yapabilirsiniz
        </Text>
        <Text style={styles.infoText}>
          📧 Örnek: isim@sabanciuniv.edu, isim@sakarya.edu.tr
        </Text>
      </View>

      <TouchableOpacity
        style={styles.registerButton}
        onPress={handleRegister}
        disabled={loading}
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
    borderRadius: 8,
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
  },
  registerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 28,
    color: '#999',
  },
  departmentList: {
    maxHeight: 500,
  },
  departmentItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  departmentItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default RegisterScreen;