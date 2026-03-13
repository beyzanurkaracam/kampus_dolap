import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: any) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      // Token yoksa bağlanma
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    // WebSocket bağlantısı oluştur
    const newSocket = io(`${API_URL}/chat`, {
      transports: ['websocket'], // polling'i kaldırıyoruz, bazen çakışma yapar
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10, // Deneme sayısını artırdık
      reconnectionDelay: 2000,
      timeout: 10000, // Timeout süresini artırdık
    });

    // Bağlantı başarılı
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    // Bağlantı koptu
    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    // Bağlantı hatası
    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setIsConnected(false);
    });

    // Hata mesajları
    newSocket.on('chat:error', (data) => {
      console.error('❌ Chat error:', data);
    });

    setSocket(newSocket);

    // Cleanup: Component unmount olduğunda bağlantıyı kapat
    return () => {
      console.log('🔌 Closing socket connection');
      newSocket.close();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};