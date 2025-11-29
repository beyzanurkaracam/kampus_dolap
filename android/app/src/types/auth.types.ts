export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export type UserType = 'user' | 'admin';
