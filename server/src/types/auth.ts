export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sub?: string; // Standard JWT sub claim
}
