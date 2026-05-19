// =============================================================
// BARREL — Tüm domain servislerini tek noktada birleştirir.
//
// Eski kullanım (değişmedi):
//   import api from '../services/api';
//   api.login(data);
//
// Yeni, domain bazlı kullanım:
//   import { authApi, productApi } from '../services/api';
//   authApi.login(data);
// =============================================================

export type { DetectUniversityResponse, User, AuthResponse } from './api/types';
export { ApiError } from './api/client';

export { authApi } from './api/auth.api';
export { userApi } from './api/user.api';
export { productApi } from './api/product.api';
export { chatApi } from './api/chat.api';
export { offerApi } from './api/offer.api';
export { commentApi } from './api/comment.api';
export { notificationApi } from './api/notification.api';
export { reviewApi } from './api/review.api';

// --- Default export: birleştirilmiş facade (geriye dönük uyumluluk) ---
// Arrow function class field'lar instance'ın own property'sidir, bu nedenle
// Object.assign prototype yerine doğrudan metotları kopyalar.
// 'this' her metotta kendi orijinal instance'ını kapsamaktadır (closure).

import { authApi } from './api/auth.api';
import { userApi } from './api/user.api';
import { productApi } from './api/product.api';
import { chatApi } from './api/chat.api';
import { offerApi } from './api/offer.api';
import { commentApi } from './api/comment.api';
import { notificationApi } from './api/notification.api';
import { reviewApi } from './api/review.api';

type ApiService = typeof authApi &
  typeof userApi &
  typeof productApi &
  typeof chatApi &
  typeof offerApi &
  typeof commentApi &
  typeof notificationApi &
  typeof reviewApi;

const apiService = Object.assign(
  {},
  authApi,
  userApi,
  productApi,
  chatApi,
  offerApi,
  commentApi,
  notificationApi,
  reviewApi,
) as ApiService;

export default apiService;
