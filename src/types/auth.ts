export type UserRole = 'admin' | 'manager' | 'EADM';
export type UserStatus = 'pending' | 'approved';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
