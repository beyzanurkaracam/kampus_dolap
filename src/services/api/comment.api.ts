import { httpClient } from './client';

class CommentApi {
  getProductComments = (productId: string): Promise<any[]> =>
    httpClient.request<any[]>(`/comments/product/${productId}/auth`, {
      fallbackError: 'Yorumlar yüklenemedi',
    });

  createComment = (productId: string, content: string): Promise<any> =>
    httpClient.request<any>('/comments', {
      method: 'POST',
      body: JSON.stringify({ productId, content }),
      fallbackError: 'Yorum gönderilemedi',
    });

  replyToComment = (parentId: string, content: string): Promise<any> =>
    httpClient.request<any>('/comments/reply', {
      method: 'POST',
      body: JSON.stringify({ parentId, content }),
      fallbackError: 'Yanıt gönderilemedi',
    });

  deleteComment = (commentId: string): Promise<any> =>
    httpClient.request<any>(`/comments/${commentId}`, {
      method: 'DELETE',
      fallbackError: 'Yorum silinemedi',
    });
}

export const commentApi = new CommentApi();
