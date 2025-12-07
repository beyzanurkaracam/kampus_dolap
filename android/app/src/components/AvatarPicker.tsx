import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import axios from 'axios';

interface AvatarPickerProps {
  avatarUrl?: string;
  token: string;
  onUploadSuccess: (url: string) => void;
  size?: number;
}

const API_URL = 'http://10.0.2.2:3000';

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ 
  avatarUrl, 
  token, 
  onUploadSuccess,
  size = 100 
}) => {
  const [uploading, setUploading] = React.useState(false);

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
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'avatar.jpg',
      } as any);

      const uploadResponse = await axios.post(`${API_URL}/upload/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      const { avatarUrl: newAvatarUrl } = uploadResponse.data;

      console.warn('📸 Avatar yüklendi:', newAvatarUrl);

      // Profili güncelle
      await axios.post(
        `${API_URL}/auth/profile/update`,
        { profilePhoto: newAvatarUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.warn('✅ Profil güncellendi');

      onUploadSuccess(newAvatarUrl);
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.message || 'Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity onPress={pickAndUploadImage} disabled={uploading}>
      <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        {uploading ? (
          <ActivityIndicator color="#007AFF" />
        ) : avatarUrl ? (
          <>
            <Image 
              source={{ uri: avatarUrl }} 
              style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
              onError={(e) => console.warn('❌ Avatar yüklenemedi:', e.nativeEvent.error)}
            />
            {console.warn('🖼️ Avatar gösteriliyor:', avatarUrl)}
          </>
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
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
    fontSize: 40,
    color: '#999',
  },
});
