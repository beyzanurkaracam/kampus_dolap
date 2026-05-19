import { httpClient, ApiError } from './client';

class ReviewApi {
  createReview = (data: { offerId: string; rating: number; comment?: string }): Promise<any> =>
    httpClient.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
      fallbackError: 'Değerlendirme gönderilemedi',
    });

  getSellerReviews = (sellerId: string): Promise<any[]> =>
    httpClient.request<any[]>(`/reviews/seller/${sellerId}`, {
      fallbackError: 'Değerlendirmeler yüklenemedi',
    });

  getReviewByOffer = async (offerId: string): Promise<any | null> => {
    try {
      return await httpClient.request<any>(`/reviews/offer/${offerId}`, {
        fallbackError: 'Değerlendirme alınamadı',
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  };
}

export const reviewApi = new ReviewApi();
