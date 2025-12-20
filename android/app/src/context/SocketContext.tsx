import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const API_URL = 'http://10.0.2.2:3000';

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
      transports: ['websocket'],
      auth: { token }, // Token'ı gönder
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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