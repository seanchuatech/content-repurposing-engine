export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionPlan: 'FREE' | 'PRO';
  subscriptionStatus?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
