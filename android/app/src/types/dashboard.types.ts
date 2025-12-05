export interface Stats {
  totalUsers: number;
  totalProducts: number;
  activeProducts: number;
  totalAdmins: number;
  pendingProducts: number;
  recentProducts: number;
}

export interface RecentUser {
  id: number;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface RecentProduct {
  id: number;
  title: string;
  price: number;
  status: string;
  createdAt: string;
  category?: {
    id: number;
    name: string;
  };
  seller?: {
    id: number;
    fullName: string;
  };
}

export interface DashboardData {
  stats: Stats;
  recentUsers: RecentUser[];
  recentProducts: RecentProduct[];
}
