import { httpClient } from './client';

class OfferApi {
  getReceivedOffers = (): Promise<any[]> =>
    httpClient.request<any[]>('/offers/received', { fallbackError: 'Teklifler alınamadı' });

  getSentOffers = (): Promise<any[]> =>
    httpClient.request<any[]>('/offers/made', {
      fallbackError: 'Gönderilen teklifler alınamadı',
    });

  acceptOffer = (id: string): Promise<{ offer: any; chatId: string }> =>
    httpClient.request(`/offers/${id}/accept`, {
      method: 'PATCH',
      fallbackError: 'Teklif kabul edilemedi',
    });

  rejectOffer = (id: string): Promise<any> =>
    httpClient.request<any>(`/offers/${id}/reject`, {
      method: 'PATCH',
      fallbackError: 'Teklif reddedilemedi',
    });

  counterOffer = (id: string, amount: number): Promise<any> =>
    httpClient.request<any>(`/offers/${id}/counter`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
      fallbackError: 'Karşı teklif gönderilemedi',
    });

  createOffer = (data: { productId: string; amount: number }): Promise<any> =>
    httpClient.request<any>('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
      fallbackError: 'Teklif gönderilemedi',
    });
}

export const offerApi = new OfferApi();
