import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AuthProvider } from './android/app/src/context/AuthContext';

// Screens
import LoginScreen from './android/app/src/screens/LoginScreen';
import RegisterScreen from './android/app/src/screens/RegisterScreen';
import { EmailVerificationScreen } from './android/app/src/screens/EmailVerificationScreen';
import AdminDashboardScreen from './android/app/src/screens/AdminDashboardScreen';
import UserHomeScreen from './android/app/src/screens/UserHomeScreen';
import UserProfileScreen from './android/app/src/screens/UserProfileScreen';
import { ProfileScreen } from './android/app/src/screens/ProfileScreen';
import { MyProductsScreen } from './android/app/src/screens/MyProductsScreen';
import { AddProductScreen } from './android/app/src/screens/AddProductScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <AuthProvider>
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
              gestureEnabled: false
            }}
          />
          <Stack.Screen 
            name="UserProfile" 
            component={UserProfileScreen}
            options={{ title: 'Profil' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'Hesabım' }}
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </AuthProvider>
  );
}

export default App;
