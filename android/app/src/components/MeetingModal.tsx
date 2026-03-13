import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import api from '../services/api';

interface MeetingModalProps {
  visible: boolean;
  onClose: () => void;
  offer: any; // Seçilen teklif objesi
  onConfirm: (meetingPointId: string, date: Date) => void;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ visible, onClose, offer, onConfirm }) => {
  const [step, setStep] = useState(1); // 1: Konum, 2: Zaman
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Modal her açıldığında verileri sıfırla ve konumları çek
  useEffect(() => {
    if (visible && offer) {
      setStep(1);
      setSelectedLocation(null);
      setDate(new Date());
      fetchLocations();
    }
  }, [visible, offer]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      // Teklifin içindeki ürünün üniversite ID'sini kullanıyoruz
      // offer.product.universityId backend'den gelmeli
      const uniId = offer?.product?.universityId; 
      if (uniId) {
        const locs = await api.getUniversityLocations(uniId);
        setLocations(locs);
      }
    } catch (error) {
      Alert.alert('Hata', 'Konumlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedLocation) {
        Alert.alert('Uyarı', 'Lütfen bir buluşma noktası seçin.');
        return;
      }
      setStep(2);
    } else {
      // Step 2: Onaylama
      onConfirm(selectedLocation!, date);
    }
  };

  // Güvenli saat kontrolü (Örn: 08:00 - 20:00 arası)
  const isTimeSafe = (selectedDate: Date) => {
    const hours = selectedDate.getHours();
    return hours >= 8 && hours <= 20;
  };

  return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.container}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {step === 1 ? '📍 Güvenli Konum Seç' : '📅 Zaman Belirle'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
  
            {}
           {offer && (
              <View style={styles.priceInfoBox}>
                <Text style={styles.priceInfoText}>
                  💰 Anlaşılan Fiyat: <Text style={styles.priceAmount}>{offer.offerAmount} ₺</Text>
                </Text>
                <Text style={styles.priceInfoSubtext}>
                  {offer.keepCurrentPrice 
                    ? 'Fiyat değişmeyecek, sadece buluşma detayı güncellenecek.'
                    : 'Sadece buluşma yeri ve zamanını belirliyorsunuz.'}
                </Text>
              </View>
            )}

          {/* Step 1: Konum Seçimi */}
          {step === 1 && (
            <View style={styles.content}>
              <Text style={styles.subtitle}>Kampüs içindeki güvenli noktalardan birini seçin:</Text>
              {loading ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : (
                <FlatList
                  data={locations}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.locationItem,
                        selectedLocation === item.id && styles.locationItemSelected
                      ]}
                      onPress={() => setSelectedLocation(item.id)}
                    >
                      <Text style={styles.locationIcon}>
                        {item.type === 'LIBRARY' ? '📚' : item.type === 'CAFE' ? '☕' : '🏢'}
                      </Text>
                      <View>
                        <Text style={styles.locationName}>{item.name}</Text>
                        <Text style={styles.locationType}>{item.type}</Text>
                      </View>
                      {selectedLocation === item.id && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          {/* Step 2: Zaman Seçimi */}
          {step === 2 && (
            <View style={[styles.content, styles.centerContent]}>
              <Text style={styles.subtitle}>Buluşma için uygun bir saat seçin (08:00 - 20:00):</Text>
              
              <DatePicker
                date={date}
                onDateChange={setDate}
                mode="datetime"
                minimumDate={new Date()} // Geçmiş tarih seçilemez
                locale="tr"
                theme="light"
              />

              {!isTimeSafe(date) && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>⚠️ Güvenli saatler dışındasınız (08:00 - 20:00). Lütfen saati değiştirin.</Text>
                </View>
              )}
            </View>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {step === 2 && (
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.nextButton, 
                step === 2 && !isTimeSafe(date) && styles.disabledButton
              ]} 
              onPress={handleNextStep}
              disabled={step === 2 && !isTimeSafe(date)}
            >
              <Text style={styles.nextButtonText}>
                {step === 1 ? 'Devam Et' : 'Onayla ve Gönder'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeText: { fontSize: 24, color: '#999' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  content: { flex: 1 },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  
  // Location List Styles
  locationItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: '#f9f9f9', marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  locationItemSelected: { borderColor: '#007AFF', backgroundColor: '#F0F8FF' },
  locationIcon: { fontSize: 24, marginRight: 15 },
  locationName: { fontSize: 16, fontWeight: '600', color: '#333' },
  locationType: { fontSize: 12, color: '#999' },
  checkIcon: { marginLeft: 'auto', fontSize: 18, color: '#007AFF', fontWeight: 'bold' },

  // Warning
  warningBox: { marginTop: 20, padding: 10, backgroundColor: '#FFF3CD', borderRadius: 8, width: '100%' },
  warningText: { color: '#856404', fontSize: 12, textAlign: 'center' },

  // Footer
  footer: { flexDirection: 'row', marginTop: 20, gap: 10 },
  backButton: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#f0f0f0', alignItems: 'center' },
  backButtonText: { color: '#333', fontWeight: '600' },
  nextButton: { flex: 2, padding: 15, borderRadius: 12, backgroundColor: '#007AFF', alignItems: 'center' },
  disabledButton: { backgroundColor: '#ccc' },
  nextButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  priceInfoBox: {
    backgroundColor: '#F0F8FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  priceInfoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 5,
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  priceInfoSubtext: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },

});