import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';

export const API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorResponse {
  message?: string;
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: RequestInit['body'] | FormData;
  fallbackError?: string;
};

class HttpClient {
  private async authHeader(): Promise<Record<string, string>> {
    const token = await EncryptedStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { fallbackError, headers: customHeaders, body, ...rest } = options;
    const isFormData = body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Expires: '0',
      ...(await this.authHeader()),
      ...(customHeaders as Record<string, string>),
    };

    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      body: body as RequestInit['body'],
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new ApiError(
        errorData.message || fallbackError || `İstek başarısız (${response.status})`,
        response.status,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async safeRequest<T>(path: string, fallback: T, options: RequestOptions = {}): Promise<T> {
    try {
      return await this.request<T>(path, options);
    } catch {
      return fallback;
    }
  }
}

export const httpClient = new HttpClient();
