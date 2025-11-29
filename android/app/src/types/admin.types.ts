export interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN';
}

export interface AdminAction {
  type: 'approve' | 'reject' | 'delete' | 'ban';
  targetId: string;
  reason?: string;
}
