import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AuthProvider } from './android/app/src/context/AuthContext';
import { SocketProvider } from './android/app/src/context/SocketContext';

// Screens
import LoginScreen from './android/app/src/screens/LoginScreen';
import RegisterScreen from './android/app/src/screens/RegisterScreen';
import { EmailVerificationScreen } from './android/app/src/screens/EmailVerificationScreen';
import AdminDashboardScreen from './android/app/src/screens/AdminDashboardScreen';
import UserHomeScreen from './android/app/src/screens/UserHomeScreen';
import { MyProductsScreen } from './android/app/src/screens/MyProductsScreen';
import { AddProductScreen } from './android/app/src/screens/AddProductScreen';
import { ProductDetailScreen } from './android/app/src/screens/ProductDetailScreen';
import { ChatScreen } from './android/app/src/screens/ChatScreen';
import { ChatDetailScreen } from './android/app/src/screens/ChatDetailScreen';
import { PremiumScreen } from './android/app/src/screens/PremiumScreen';
import { MakeOfferScreen } from './android/app/src/screens/MakeOfferScreen';
import { UserProfileScreen } from './android/app/src/screens/UserProfileScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
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
                options={{ 
                  title: 'Email Doğrulama',
                  headerLeft: () => null,
                }}
              />
              <Stack.Screen 
                name="AdminDashboard" 
                component={AdminDashboardScreen}
                options={{ 
                  title: 'Admin Paneli',
                  headerLeft: () => null,
                  gestureEnabled: false
                }}
              />
              <Stack.Screen 
                name="UserHome" 
                component={UserHomeScreen}
                options={{ 
                  title: 'Ana Sayfa',
                  headerLeft: () => null,
                  gestureEnabled: false,
                  headerShown: false
                }}
              />
              
              
              <Stack.Screen 
              name="UserProfile" 
              component={UserProfileScreen} 
              options={{ 
                // headerShown: false,  <-- BUNU SİLİYORUZ (veya true yapıyoruz)
                title: 'Profil',         // Varsayılan başlık
                headerBackTitle: 'Geri', // Sol üstteki geri tuşunda ne yazsın?
                headerTintColor: '#007AFF', // Geri tuşu rengi (iOS Mavisi)
                headerTitleStyle: { color: '#000' } // Başlık rengi
              }} 
/>

              {/* 👇 ProfileScreen yerine artık UserProfile kullanıyoruz, o yüzden eskisini kaldırdım */}
              
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
                options={{ 
                  title: 'Mesajlarım',
                  headerBackTitle: 'Geri'
                }}
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
                options={{ 
                  title: 'Sohbet',
                  headerBackTitle: 'Geri'
                }}
              />
              <Stack.Screen 
                name="MakeOffer" 
                component={MakeOfferScreen} 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;