export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  bio?: string;
}
