import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { AppConfig } from '../config/env';

// Socket kök adresi ortam değişkenlerinden (react-native-config) gelir.
const SOCKET_URL = AppConfig.SOCKET_URL;
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

    const newSocket = io(`${SOCKET_URL}/chat`, {
      // 👑 SENIOR DOKUNUŞU: transports satırını sildik. 
      // Socket.io önce polling ile bağlanıp sonra websocket'e güvenle geçecek.
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000, 
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