import { Google } from 'arctic';

const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID ?? '',
  process.env.GOOGLE_CLIENT_SECRET ?? '',
  `${serverUrl}/api/auth/google/callback`
);
