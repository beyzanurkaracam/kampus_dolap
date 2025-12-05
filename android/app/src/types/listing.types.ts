export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  category?: Category;
  categoryName?: string;
  images: ProductImage[];
  createdAt: string;
  seller?: User;
  description?: string;
  condition?: string;
  status?: string;
  brand?: string;
  color?: string;
}

export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
}
