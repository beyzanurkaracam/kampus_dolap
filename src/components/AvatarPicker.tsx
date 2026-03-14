import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
// Axios yerine kendi sınıf tabanlı API servisimizi çağırıyoruz
import ApiService from '../services/api'; 

interface AvatarPickerProps {
  avatarUrl?: string;
  onUploadSuccess: (url: string) => void;
  size?: number;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ 
  avatarUrl, 
  onUploadSuccess,
  size = 100 
}) => {
  const [uploading, setUploading] = useState(false);

  const pickAndUploadImage = async () => {
    const result = await ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    });

    if (result.didCancel || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const formData = new FormData();
      
      // React Native FormData tipi için gerekli format
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'avatar.jpg',
      } as unknown as Blob);

      console.log('Avatar yükleme başladı...');
      
      // 1. İşlem: Api servisi üzerinden fotoğrafı yükle
      const newAvatarUrl = await ApiService.uploadAvatar(formData);
      console.log('Avatar URL döndü:', newAvatarUrl);
      
      if (!newAvatarUrl) {
        throw new Error('Avatar URL boş döndü');
      }
      
      // 2. İşlem: Api servisi üzerinden profili güncelle
      console.log('Profil güncelleniyor...');
      const updatedProfile = await ApiService.updateProfile(newAvatarUrl);
      console.log('Profil güncellendi:', updatedProfile);

      onUploadSuccess(newAvatarUrl);
      Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
    } catch (error: any) {
      console.error('Avatar yükleme hatası:', error);
      console.error('Hata detayı:', error.message);
      Alert.alert('Hata', error.message || 'Fotoğraf yüklenirken bir sorun oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const dynamicSize = { width: size, height: size, borderRadius: size / 2 };

  return (
    <TouchableOpacity onPress={pickAndUploadImage} disabled={uploading} activeOpacity={0.7}>
      <View style={[styles.avatarContainer, dynamicSize]}>
        {uploading ? (
          <ActivityIndicator color="#007AFF" size="large" />
        ) : avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }} 
            style={[styles.avatar, dynamicSize]}
            onError={() => console.warn('Avatar yüklenemedi, URL kontrol edilmeli.')}
          />
        ) : (
          <View style={[styles.placeholder, dynamicSize]}>
            <Text style={styles.placeholderText}>+</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  avatar: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
    color: '#999',
    fontWeight: '300',
  },
});