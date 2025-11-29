export interface Stats {
  totalUsers: number;
  totalListings: number;
  totalReviews: number;
}

export interface RecentUser {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface RecentListing {
  id: string;
  title: string;
  price: number;
  category: string;
  createdAt: string;
}

export interface DashboardData {
  stats: Stats;
  recentUsers: RecentUser[];
  recentListings: RecentListing[];
}
