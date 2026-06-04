import React from 'react';
import * as Sentry from '@sentry/react-native';
import { initSentry } from './src/config/sentry';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import { EmailVerificationScreen } from './src/screens/auth/EmailVerificationScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import UserHomeScreen from './src/screens/user/UserHomeScreen';
import { UserProfileScreen } from './src/screens/user/UserProfileScreen';
import { MyProductsScreen } from './src/screens/product/MyProductsScreen';
import { AddProductScreen } from './src/screens/product/AddProductScreen';
import { ProductDetailScreen } from './src/screens/product/ProductDetailScreen';
import { ChatScreen } from './src/screens/chat/ChatScreen';
import { PremiumScreen } from './src/screens/user/PremiumScreen';
import { ChatDetailScreen } from './src/screens/chat/ChatDetailScreen';
import { MakeOfferScreen } from './src/screens/offer/MakeOfferScreen';
import { NotificationsScreen } from './src/screens/notification/NotificationsScreen';
import { ReviewScreen } from './src/screens/review/ReviewScreen';

// 👑 EKSİK OLAN SATIR BURASIYDI: OffersScreen'i süslü parantezle dahil ettik
import { OffersScreen } from './src/screens/offer/OffersScreen'; // Klasör yolunu kendi projene göre teyit et

// Sentry'i uygulama render edilmeden önce başlat (DSN yoksa no-op).
initSentry();

const Stack = createNativeStackNavigator();

// 👑 ANA NAVIGATOR (Güvenlik Kontrollü)
const RootNavigator = () => {
  const { isLoggedIn, loading, user } = useAuth();

  // Yükleme ekranı (Token kontrol edilirken)
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {isLoggedIn ? (
        <Stack.Group>
          {user?.role === 'ADMIN' ? (
             <Stack.Screen 
               name="AdminDashboard" 
               component={AdminDashboardScreen} 
               options={{ title: 'Admin Paneli', headerLeft: () => null, gestureEnabled: false }} 
             />
          ) : (
             <Stack.Screen 
               name="UserHome" 
               component={UserHomeScreen} 
               options={{ title: 'Ana Sayfa', headerLeft: () => null, gestureEnabled: false, headerShown: false }} 
             />
          )}

          <Stack.Screen 
            name="UserProfile" 
            component={UserProfileScreen} 
            options={{ 
              title: 'Profil', 
              headerBackTitle: 'Geri', 
              headerTintColor: '#007AFF', 
              headerTitleStyle: { color: '#000' } 
            }} 
          />
          
          <Stack.Screen 
            name="MyProducts" 
            component={MyProductsScreen} 
            options={{ headerShown: false }} 
          />
          
          <Stack.Screen 
            name="AddProduct" 
            component={AddProductScreen} 
            options={{ headerShown: false }} 
          />
          
          <Stack.Screen 
            name="ProductDetail" 
            component={ProductDetailScreen} 
            options={{ title: 'Ürün Detayı' }} 
          />
          
          {/* Chat Screens */}
          <Stack.Screen 
            name="Chats" 
            component={ChatScreen} 
            options={{ title: 'Mesajlarım', headerBackTitle: 'Geri' }} 
          />
          
          <Stack.Screen 
            name="Premium" 
            component={PremiumScreen} 
            options={{ 
              title: 'Premium Üyelik', 
              headerStyle: { backgroundColor: '#1a1a1a' }, 
              headerTintColor: '#FFD700', 
              headerTitleStyle: { fontWeight: 'bold' } 
            }} 
          />
          
          <Stack.Screen 
            name="ChatDetail" 
            component={ChatDetailScreen} 
            options={{ title: 'Sohbet', headerBackTitle: 'Geri' }} 
          />
          
          <Stack.Screen 
            name="Offers" 
            component={OffersScreen} 
            options={{ title: 'Teklifler', headerBackTitle: 'Geri' }} 
          />

          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen} 
            options={{ 
              title: 'Bildirimler', 
              headerBackTitle: 'Geri',
              headerTintColor: '#007AFF',
              headerTitleStyle: { color: '#000' }
            }} 
          />
          
          <Stack.Screen
            name="MakeOffer"
            component={MakeOfferScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />

          <Stack.Screen
            name="Review"
            component={ReviewScreen}
            options={{ title: 'Değerlendirme', headerBackTitle: 'Geri', presentation: 'modal' }}
          />
        </Stack.Group>
      ) : (
        // ❌ GİRİŞ YAPMAMIŞ (ZİYARETÇİ) EKRANLARI
        <Stack.Group>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ title: 'Kayıt Ol' }} 
          />
          <Stack.Screen 
            name="EmailVerification" 
            component={EmailVerificationScreen} 
            options={{ title: 'Email Doğrulama', headerLeft: () => null }} 
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <NavigationContainer>
            <RootNavigator /> 
          </NavigationContainer>
        </SafeAreaProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

// Sentry.wrap, hata sınırları ve performans izlemeyi kök bileşene bağlar.
export default Sentry.wrap(App);