import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import type { ImagePickerResponse, Asset } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface SelectedImage { uri: string; name: string; type: string; }
interface Category { id: number; name: string; brandCategory?: string; mainCategory?: string; subCategory?: string; }
interface Brand { id: string; name: string; }
interface Color { id: string; name: string; hex: string; }

type ModalType = 'mainCategory' | 'subCategory' | 'brand' | 'color' | null;

export const AddProductScreen = ({ navigation }: any) => {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'fair' | 'poor'>('good');
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  
  const [colors, setColors] = useState<Color[]>([]);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const mainCategories = useMemo(() => {
    return [...new Set(allCategories.map(cat => cat.mainCategory))].filter(Boolean) as string[];
  }, [allCategories]);

  const subCategories = useMemo(() => {
    if (!selectedMainCategory) return [];
    return allCategories.filter(cat => cat.mainCategory === selectedMainCategory);
  }, [allCategories, selectedMainCategory]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchBrands(selectedCategory.brandCategory || 'giyim');
    } else {
      setBrands([]);
      setSelectedBrand(null);
    }
  }, [selectedCategory]);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, colorsRes] = await Promise.all([
        api.getCategories(),
        api.getColors(),
      ]);
      setAllCategories(categoriesRes.categories || []);
      setColors(colorsRes.colors || []);
    } catch (error) {
      Alert.alert('Hata', 'Kategori ve renk verileri yüklenemedi');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchBrands = async (brandCategoryId: string) => {
    try {
      const response = await api.getBrands(brandCategoryId);
      setBrands(response.brands || []);
    } catch (error) {
      console.error('Markalar yüklenirken hata:', error);
    }
  };

  const selectImages = () => {
    ImagePicker.launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 5, quality: 0.8 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Hata', response.errorMessage || 'Resim seçilirken hata oluştu');
          return;
        }
        if (response.assets) {
          const images: SelectedImage[] = response.assets.map((asset: Asset) => ({
            uri: asset.uri!,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
          }));
          setSelectedImages(images);
        }
      }
    );
  };

  const removeImage = (index: number) => setSelectedImages(prev => prev.filter((_, i) => i !== index));

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];
    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const image of selectedImages) {
        const formData = new FormData();
        
        // 👑 SENIOR FIX: iOS ve Android URI farklılıklarını gideriyoruz
        // Android'de file:// prefix olduğu gibi kalmalı, iOS'ta kaldırılmalı
        const safeUri = Platform.OS === 'android' 
          ? image.uri  // Android'de file:// prefix olduğu gibi kalmalı
          : image.uri.replace('file://', ''); // iOS'ta kaldır

        formData.append('file', {
          uri: safeUri,
          name: image.name,
          type: image.type,
        } as any);

        const response = await api.uploadImage(formData);
        
        // DİKKAT: Backend'in tam olarak "imageUrl" döndüğünden emin ol. Eğer farklıysa burayı güncelle.
        if (response.imageUrl) {
            uploadedUrls.push(response.imageUrl);
        } else {
            console.warn('Backend başarılı dedi ama imageUrl dönmedi:', response);
        }
      }
      return uploadedUrls;
    } catch (error: any) {
      // GERÇEK HATAYI YAKALA VE GÖSTER
      console.error('RESİM YÜKLEME DETAYLI HATA:', error);
      throw new Error(error.message || 'Resim sunucuya iletilemedi.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price || !selectedCategory) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun');
      return;
    }
    
    const safePrice = price.replace(',', '.');
    const priceNum = parseFloat(safePrice);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir fiyat girin');
      return;
    }
    
    setLoading(true);
    
    try {
      if (!token) {
        navigation.replace('Login');
        return;
      }
    
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages();
      }
    
      await api.createProduct({
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        mainCategory: selectedCategory.mainCategory,
        subCategory: selectedCategory.subCategory,
        condition,
        brand: selectedBrand?.name,
        color: selectedColor?.name,
        images: imageUrls,
      });
    
      Alert.alert('Başarılı', 'Ürün eklendi 🎉', [
        { 
          text: 'Tamam', 
          onPress: () => {
            // 👑 SENIOR FIX: Sadece geri gitme, MyProducts sayfasına git ve ona yenileme sinyali gönder!
            navigation.navigate('MyProducts', { refresh: Date.now() });
          }
        },
      ]);
    
    } catch (error: any) {
      if (error.status === 403) {
        Alert.alert(
          'Limit Aşıldı 🔒',
          'Ücretsiz üyelik ile en fazla 3 ürün yükleyebilirsiniz. Sınırsız ilan için Premium\'a geçin!',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Premium\'a Geç', onPress: () => navigation.navigate('Premium') }
          ]
        );
      } else {
        Alert.alert('Ürün Eklenemedi', error.message || 'Bilinmeyen bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const conditionOptions = [
    { value: 'new', label: 'Sıfır' },
    { value: 'like_new', label: 'Sıfır Gibi' },
    { value: 'good', label: 'İyi' },
    { value: 'fair', label: 'Orta' },
    { value: 'poor', label: 'Eski' },
  ];

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.backButton}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ürün Ekle</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          style={styles.form} 
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.field}>
            <Text style={styles.label}>Başlık *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ürün başlığı" maxLength={100} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Açıklama *</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Ürün açıklaması" multiline numberOfLines={4} maxLength={500} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fiyat (₺) *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ürün Resimleri (Maksimum 5)</Text>
            <TouchableOpacity style={styles.imagePickerButton} onPress={selectImages} activeOpacity={0.8}>
              <Text style={styles.imagePickerText}>
                {selectedImages.length > 0 ? `${selectedImages.length} resim seçildi` : '📷 Resim Seç'}
              </Text>
            </TouchableOpacity>
            
            {selectedImages.length > 0 && (
              <ScrollView horizontal style={styles.imagePreviewContainer} showsHorizontalScrollIndicator={false}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ana Kategori *</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setActiveModal('mainCategory')}>
              <Text style={selectedMainCategory ? styles.selectedText : styles.placeholderText}>{selectedMainCategory || 'Ana kategori seçin'}</Text>
            </TouchableOpacity>
          </View>

          {selectedMainCategory && (
            <View style={styles.field}>
              <Text style={styles.label}>Alt Kategori *</Text>
              <TouchableOpacity style={styles.selectButton} onPress={() => setActiveModal('subCategory')}>
                <Text style={selectedCategory ? styles.selectedText : styles.placeholderText}>{selectedCategory ? selectedCategory.subCategory : 'Alt kategori seçin'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedCategory && (
            <View style={styles.field}>
              <Text style={styles.label}>Marka</Text>
              <TouchableOpacity style={styles.selectButton} onPress={() => setActiveModal('brand')}>
                <Text style={selectedBrand ? styles.selectedText : styles.placeholderText}>{selectedBrand ? selectedBrand.name : 'Marka seçin (opsiyonel)'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Renk</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setActiveModal('color')}>
              <View style={styles.colorSelectContent}>
                {selectedColor && <View style={[styles.colorPreview, { backgroundColor: selectedColor.hex }]} />}
                <Text style={selectedColor ? styles.selectedText : styles.placeholderText}>{selectedColor ? selectedColor.name : 'Renk seçin (opsiyonel)'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Durum *</Text>
            <View style={styles.conditionContainer}>
              {conditionOptions.map((option) => (
                <TouchableOpacity key={option.value} style={[styles.conditionButton, condition === option.value && styles.conditionButtonActive]} onPress={() => setCondition(option.value as any)} activeOpacity={0.8}>
                  <Text style={[styles.conditionText, condition === option.value && styles.conditionTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, (loading || uploadingImages) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading || uploadingImages} activeOpacity={0.8}>
            {(loading || uploadingImages) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" />
                {uploadingImages && <Text style={[styles.submitButtonText, { marginLeft: 10 }]}>Resimler yükleniyor...</Text>}
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Ürünü Ekle</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={activeModal !== null} transparent animationType="slide">
        <View style={styles.modalContainerSide}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
          <View style={styles.modalContentSide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'mainCategory' && 'Ana Kategori Seçin'}
                {activeModal === 'subCategory' && 'Alt Kategori Seçin'}
                {activeModal === 'brand' && 'Marka Seçin'}
                {activeModal === 'color' && 'Renk Seçin'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={(activeModal === 'mainCategory' ? mainCategories : activeModal === 'subCategory' ? subCategories : activeModal === 'brand' ? brands : activeModal === 'color' ? colors : []) as any[]}
              keyExtractor={(item: any, index) => (typeof item === 'string' ? item : String(item.id || index))}
              renderItem={({ item }: { item: any }) => {
                if (activeModal === 'mainCategory') {
                  return (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedMainCategory(item as string); setSelectedCategory(null); setActiveModal(null); }}>
                      <Text style={styles.modalItemText}>{item as string}</Text>
                    </TouchableOpacity>
                  );
                }
                if (activeModal === 'subCategory') {
                  const cat = item as Category;
                  return (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedCategory(cat); setActiveModal(null); }}>
                      <Text style={styles.modalItemText}>{cat.subCategory}</Text>
                    </TouchableOpacity>
                  );
                }
                if (activeModal === 'brand') {
                  const brand = item as Brand;
                  return (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedBrand(brand); setActiveModal(null); }}>
                      <Text style={styles.modalItemText}>{brand.name}</Text>
                    </TouchableOpacity>
                  );
                }
                if (activeModal === 'color') {
                  const color = item as Color;
                  return (
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedColor(color); setActiveModal(null); }}>
                      <View style={styles.colorItem}>
                        <View style={[styles.colorBox, { backgroundColor: color.hex }]} />
                        <Text style={styles.modalItemText}>{color.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                return null;
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton: { fontSize: 18, color: '#007AFF', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  form: { flex: 1 },
  formContent: { flexGrow: 1, padding: 20, paddingBottom: 100 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  selectButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  placeholderText: { color: '#999', fontSize: 16 },
  selectedText: { color: '#333', fontSize: 16 },
  colorSelectContent: { flexDirection: 'row', alignItems: 'center' },
  colorPreview: { width: 24, height: 24, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  conditionContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  conditionButton: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  conditionButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  conditionText: { color: '#333', fontSize: 14 },
  conditionTextActive: { color: '#fff', fontWeight: '600' },
  submitButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30, marginBottom: 50 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  modalContainerSide: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContentSide: { width: '75%', backgroundColor: '#fff', height: '100%', shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalClose: { fontSize: 24, color: '#666' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, color: '#333' },
  colorItem: { flexDirection: 'row', alignItems: 'center' },
  colorBox: { width: 30, height: 30, borderRadius: 15, marginRight: 15, borderWidth: 1, borderColor: '#ddd' },
  imagePickerButton: { backgroundColor: '#e5f1ff', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#cce5ff' },
  imagePickerText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  imagePreviewContainer: { marginTop: 10, maxHeight: 120 },
  imagePreview: { marginRight: 10, position: 'relative' },
  previewImage: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#f0f0f0' },
  removeImageButton: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff3b30', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2 },
  removeImageText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});