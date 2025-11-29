export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  createdAt: string;
  user: User;
  description?: string;
  condition?: string;
}

export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
}
