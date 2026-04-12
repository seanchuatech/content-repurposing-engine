export interface User {
  id: string;
  email: string;
  name: string | null;
  subscriptionPlan: 'FREE' | 'PRO';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
