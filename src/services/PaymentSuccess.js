import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const { refreshProfile, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateUserStatus = async () => {
        // 1. Profili yenile
        await refreshProfile(); 
        
        // 2. Artık 'user' objesi güncel (Premium)
        // Kullanıcıyı premium dashboard'a yönlendir veya konfeti patlat 🎉
    };

    updateUserStatus();
  }, [refreshProfile]);

  return (
    <div className="text-center p-10">
      <h2>Ödeme Başarılı!</h2>
      <p>Hesabınız Premium'a yükseltiliyor...</p>
    </div>
  );
};