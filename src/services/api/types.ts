export interface DetectUniversityResponse {
  success: boolean;
  university?: { id?: string; name: string; domain?: string };
  departments?: string[];
  message?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'ADMIN' | 'USER';
  isPremium?: boolean;
  university?: { id?: string; name: string; domain?: string } | string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
