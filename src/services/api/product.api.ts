import { httpClient, ApiError } from './client';

type FavoritesBackendResponse = any[] | { favorites?: any[] };

class ProductApi {
  // --- LİSTELEME & KATEGORİ ---
  getUserProducts = (userId: string): Promise<any[]> =>
    httpClient.request<any[]>(`/products?sellerId=${userId}`, {
      fallbackError: 'Ürünler alınamadı',
    });

  getMyProducts = (): Promise<any[]> =>
    httpClient.request<any[]>('/products/my-products', { fallbackError: 'Ürünler alınamadı' });

  getListings = (params: Record<string, any>): Promise<any[]> => {
    const query = new URLSearchParams(params as any).toString();
    return httpClient.request<any[]>(`/products?${query}`, { fallbackError: 'İlanlar yüklenemedi' });
  };

  getCategories = (): Promise<any> =>
    httpClient.request<any>('/products/categories', { fallbackError: 'Kategoriler yüklenemedi' });

  getColors = (): Promise<any> =>
    httpClient.request<any>('/products/colors', { fallbackError: 'Renkler alınamadı' });

  getBrands = (categoryId: string): Promise<any> =>
    httpClient.request<any>(`/products/brands/${categoryId}`, { fallbackError: 'Markalar alınamadı' });

  // --- ÜRÜN DETAY & CRUD ---
  getProduct = (productId: string): Promise<any> =>
    httpClient.request<any>(`/products/${productId}`, {
      fallbackError: 'Ürün bilgileri yüklenemedi',
    });

  getSimilarProducts = (productId: string): Promise<any[]> =>
    httpClient.safeRequest<any[]>(`/products/${productId}/similar`, []);

  createProduct = (data: any): Promise<any> =>
    httpClient.request<any>('/products/create', {
      method: 'POST',
      body: JSON.stringify(data),
      fallbackError: 'Ürün eklenemedi',
    });

  deleteProduct = (productId: string): Promise<void> =>
    httpClient.request<void>(`/products/${productId}`, {
      method: 'DELETE',
      fallbackError: 'Ürün silinemedi',
    });

  reserveProduct = (productId: string): Promise<any> =>
    httpClient.request<any>(`/products/${productId}/reserve`, {
      method: 'PATCH',
      fallbackError: 'Ürün rezerve edilemedi',
    });

  unreserveProduct = (productId: string): Promise<any> =>
    httpClient.request<any>(`/products/${productId}/unreserve`, {
      method: 'PATCH',
      fallbackError: 'İşlem başarısız',
    });

  markProductSold = (
    productId: string,
  ): Promise<{ product: any; buyerId: string | null; offerId: string | null }> =>
    httpClient.request(`/products/${productId}/sold`, {
      method: 'PATCH',
      fallbackError: 'Satış işaretlenemedi',
    });

  // --- FAVORİ ---
  getFavorites = async (): Promise<any[]> => {
    try {
      const data = await httpClient.request<FavoritesBackendResponse>('/products/favorites', {
        fallbackError: 'Favoriler yüklenemedi',
      });
      return Array.isArray(data) ? data : data.favorites || [];
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  };

  addFavorite = (productId: string): Promise<void> =>
    httpClient.request<void>(`/products/favorites/${productId}`, {
      method: 'POST',
      fallbackError: 'Favori eklenemedi',
    });

  removeFavorite = (productId: string): Promise<void> =>
    httpClient.request<void>(`/products/favorites/${productId}`, {
      method: 'DELETE',
      fallbackError: 'Favori kaldırılamadı',
    });

  addProductFavorite = (productId: string): Promise<void> =>
    httpClient.request<void>(`/products/${productId}/favorite`, {
      method: 'POST',
      fallbackError: 'Favorilere eklenemedi',
    });

  // --- ADMİN ---
  getAdminDashboardStats = (): Promise<any> =>
    httpClient.request<any>('/admin/dashboard', { fallbackError: 'Dashboard verileri alınamadı' });

  getPendingProducts = (): Promise<any[]> =>
    httpClient.request<any[]>('/admin/pending-products', {
      fallbackError: 'Bekleyen ürünler alınamadı',
    });

  approveProduct = (productId: string): Promise<void> =>
    httpClient.request<void>(`/admin/approve-product/${productId}`, {
      method: 'POST',
      fallbackError: 'Ürün onaylanamadı',
    });

  rejectProduct = (productId: string): Promise<void> =>
    httpClient.request<void>(`/admin/reject-product/${productId}`, {
      method: 'POST',
      fallbackError: 'Ürün reddedilemedi',
    });
}

export const productApi = new ProductApi();
