import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'react-native-image-picker';
import type { ImagePickerResponse, Asset } from 'react-native-image-picker';



const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';


export const API_URL = BASE_URL;

interface SelectedImage {
  uri: string;
  name: string;
  type: string;
}

interface Category {
  id: number; // Number olarak değiştirdik
  name: string;
  brandCategory?: string;
  mainCategory?: string;
  subCategory?: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Color {
  id: string;
  name: string;
  hex: string;
}

export const AddProductScreen = ({ navigation }: any) => {
  const { token } = useAuth();
  
  console.log('AddProductScreen - token:', token ? 'Var (ilk 20 karakter: ' + token.substring(0, 20) + ')' : 'YOK!!!');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'fair' | 'poor'>('good');
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [mainCategories, setMainCategories] = useState<string[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showMainCategoryModal, setShowMainCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  
  const [colors, setColors] = useState<Color[]>([]);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [showColorModal, setShowColorModal] = useState(false);
  
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedMainCategory) {
      // Ana kategori seçildiğinde alt kategorileri filtrele
      const filtered = allCategories.filter(cat => cat.mainCategory === selectedMainCategory);
      setSubCategories(filtered);
      setSelectedCategory(null); // Alt kategori seçimini sıfırla
    } else {
      setSubCategories([]);
    }
  }, [selectedMainCategory, allCategories]);

  useEffect(() => {
    if (selectedCategory) {
      fetchBrands();
    } else {
      setBrands([]);
      setSelectedBrand(null);
    }
  }, [selectedCategory]);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, colorsRes] = await Promise.all([
        axios.get(`${API_URL}/products/categories`),
        axios.get(`${API_URL}/products/colors`),
      ]);
      
      const cats = categoriesRes.data.categories || [];
      setAllCategories(cats);
      
      // Ana kategorileri çıkar (unique)
      const mains = [...new Set(cats.map((cat: Category) => cat.mainCategory))];
      setMainCategories(mains as string[]);
      
      setColors(colorsRes.data.colors || []);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      // Seçili kategorinin brandCategory'sini kullan
      const brandCategoryId = selectedCategory?.brandCategory || 'giyim';
      const response = await axios.get(`${API_URL}/products/brands/${brandCategoryId}`);
      setBrands(response.data.brands || []);
    } catch (error) {
      console.error('Markalar yüklenirken hata:', error);
    }
  };

  const selectImages = () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 5, // Maksimum 5 resim
        quality: 0.8,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('Kullanıcı resim seçmeyi iptal etti');
        } else if (response.errorCode) {
          Alert.alert('Hata', response.errorMessage || 'Resim seçilirken hata oluştu');
        } else if (response.assets) {
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

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const image of selectedImages) {
        console.log('📤 Resim yükleniyor:', image.name);
        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          name: image.name,
          type: image.type,
        } as any);

        console.log('🔗 Upload URL:', `${API_URL}/upload/image`);
        console.log('🔑 Token:', token ? 'Mevcut' : 'YOK');

        const response = await axios.post(`${API_URL}/upload/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('✅ Resim yüklendi:', response.data.imageUrl);
        uploadedUrls.push(response.data.imageUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error('❌ Resimler yüklenirken hata:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error('Resimler yüklenemedi');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price || !selectedCategory) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    const priceNum = parseFloat(price);
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

      // Önce resimleri yükle
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        try {
          imageUrls = await uploadImages();
        } catch (error) {
          Alert.alert('Hata', 'Resimler yüklenemedi');
          setLoading(false);
          return;
        }
      }

      await axios.post(
        `${API_URL}/products/create`,
        {
          title: title.trim(),
          description: description.trim(),
          price: priceNum,
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name, // "Women - Sweaters"
          mainCategory: selectedCategory.mainCategory, // "Women"
          subCategory: selectedCategory.subCategory, // "Sweaters"
          condition,
          brand: selectedBrand?.name,
          color: selectedColor?.name,
          images: imageUrls, // S3'e yüklenmiş resim URL'leri
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Başarılı', 'Ürün eklendi', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Ürün eklenirken hata:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Ürün eklenemedi');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ürün Ekle</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}>
        <ScrollView 
          style={styles.form} 
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}>
          <View style={styles.field}>
            <Text style={styles.label}>Başlık *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ürün başlığı"
              maxLength={100}
            />
          </View>

        <View style={styles.field}>
          <Text style={styles.label}>Açıklama *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ürün açıklaması"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Fiyat (₺) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Resim Seçimi */}
        <View style={styles.field}>
          <Text style={styles.label}>Ürün Resimleri (Maksimum 5)</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={selectImages}>
            <Text style={styles.imagePickerText}>
              {selectedImages.length > 0
                ? `${selectedImages.length} resim seçildi`
                : '📷 Resim Seç'}
            </Text>
          </TouchableOpacity>
          
          {selectedImages.length > 0 && (
            <ScrollView
              horizontal
              style={styles.imagePreviewContainer}
              showsHorizontalScrollIndicator={false}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}>
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ana Kategori *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowMainCategoryModal(true)}>
            <Text style={selectedMainCategory ? styles.selectedText : styles.placeholderText}>
              {selectedMainCategory || 'Ana kategori seçin (Kadın/Erkek)'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedMainCategory && (
          <View style={styles.field}>
            <Text style={styles.label}>Alt Kategori *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowSubCategoryModal(true)}>
              <Text style={selectedCategory ? styles.selectedText : styles.placeholderText}>
                {selectedCategory ? selectedCategory.subCategory : 'Alt kategori seçin'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedCategory && (
          <View style={styles.field}>
            <Text style={styles.label}>Marka</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowBrandModal(true)}>
              <Text style={selectedBrand ? styles.selectedText : styles.placeholderText}>
                {selectedBrand ? selectedBrand.name : 'Marka seçin (opsiyonel)'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Renk</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowColorModal(true)}>
            <View style={styles.colorSelectContent}>
              {selectedColor && (
                <View style={[styles.colorPreview, { backgroundColor: selectedColor.hex }]} />
              )}
              <Text style={selectedColor ? styles.selectedText : styles.placeholderText}>
                {selectedColor ? selectedColor.name : 'Renk seçin (opsiyonel)'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Durum *</Text>
          <View style={styles.conditionContainer}>
            {conditionOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.conditionButton,
                  condition === option.value && styles.conditionButtonActive,
                ]}
                onPress={() => setCondition(option.value as any)}>
                <Text
                  style={[
                    styles.conditionText,
                    condition === option.value && styles.conditionTextActive,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (loading || uploadingImages) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || uploadingImages}>
          {(loading || uploadingImages) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" />
              {uploadingImages && (
                <Text style={[styles.submitButtonText, { marginLeft: 10 }]}>
                  Resimler yükleniyor...
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Ürünü Ekle</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Main Category Modal */}
      <Modal visible={showMainCategoryModal} transparent animationType="slide">
        <View style={styles.modalContainerSide}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowMainCategoryModal(false)}
          />
          <View style={styles.modalContentSide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ana Kategori Seçin</Text>
              <TouchableOpacity onPress={() => setShowMainCategoryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={mainCategories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedMainCategory(item);
                    setShowMainCategoryModal(false);
                  }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Sub Category Modal */}
      <Modal visible={showSubCategoryModal} transparent animationType="slide">
        <View style={styles.modalContainerSide}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowSubCategoryModal(false)}
          />
          <View style={styles.modalContentSide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alt Kategori Seçin</Text>
              <TouchableOpacity onPress={() => setShowSubCategoryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={subCategories}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowSubCategoryModal(false);
                  }}>
                  <Text style={styles.modalItemText}>{item.subCategory}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Brand Modal */}
      <Modal visible={showBrandModal} transparent animationType="slide">
        <View style={styles.modalContainerSide}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowBrandModal(false)}
          />
          <View style={styles.modalContentSide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Marka Seçin</Text>
              <TouchableOpacity onPress={() => setShowBrandModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={brands}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedBrand(item);
                    setShowBrandModal(false);
                  }}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Color Modal */}
      <Modal visible={showColorModal} transparent animationType="slide">
        <View style={styles.modalContainerSide}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowColorModal(false)}
          />
          <View style={styles.modalContentSide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Renk Seçin</Text>
              <TouchableOpacity onPress={() => setShowColorModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={colors}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedColor(item);
                    setShowColorModal(false);
                  }}>
                  <View style={styles.colorItem}>
                    <View style={[styles.colorBox, { backgroundColor: item.hex }]} />
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 30,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 200,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  selectedText: {
    color: '#333',
    fontSize: 16,
  },
  colorSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  conditionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  conditionButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  conditionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  conditionText: {
    color: '#333',
    fontSize: 14,
  },
  conditionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 50,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainerSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContentSide: {
    width: '75%',
    backgroundColor: '#fff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imagePickerButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginTop: 10,
    maxHeight: 120,
  },
  imagePreview: {
    marginRight: 10,
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
