import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform, Alert, PermissionsAndroid } from 'react-native';

// API URL (Senin standart yapın)
const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

class NotificationService {
  
  // 1. İzin İsteme Fonksiyonu
  async requestUserPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
        } else {
            return false;
        }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Bildirim izni verildi:', authStatus);
      return true;
    } else {
      console.log('Bildirim izni reddedildi');
      return false;
    }
  }

  // 2. Token Alma ve Backend'e Gönderme
  async getFCMToken(userAuthToken: string) {
    try {
      // Önce izin var mı kontrol et
      const hasPermission = await this.requestUserPermission();
      if (!hasPermission) return;

      // Firebase'den Token'ı al
      const fcmToken = await messaging().getToken();
      
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        
        // Backend'e kaydet (Eğer daha önce kaydetmediysek veya değiştiyse)
        // Optimizasyon için AsyncStorage kontrolü yapılabilir ama şimdilik her açılışta gönderelim, garanti olsun.
        await this.saveTokenToBackend(fcmToken, userAuthToken);
      } else {
        console.log('FCM Token üretilemedi');
      }

    } catch (error) {
      console.error('FCM Token Hatası:', error);
    }
  }

  // 3. Backend API Çağrısı
  async saveTokenToBackend(fcmToken: string, userAuthToken: string) {
    try {
      await axios.post(
        `${BASE_URL}/auth/fcm-token`,
        { token: fcmToken },
        { headers: { Authorization: `Bearer ${userAuthToken}` } }
      );
      console.log('Token Backend veritabanına kaydedildi!');
    } catch (error) {
      console.error('Token Backend\'e gönderilemedi:', error);
    }
  }
}

export default new NotificationService();