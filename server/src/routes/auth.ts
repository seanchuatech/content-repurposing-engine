import { Elysia, t } from 'elysia';
import { AuthService } from '../services/auth-service';
import { authGuard } from '../middleware/auth-guard';
import { google } from '../lib/oauth';
import { generateState, generateCodeVerifier } from 'arctic';
import type { JWTPayload } from '../types/auth';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authGuard)
  .get('/google', async ({ cookie: { google_oauth_state, google_oauth_code_verifier }, set }) => {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = await google.createAuthorizationURL(state, codeVerifier, ['profile', 'email']);

    const stateCookie = google_oauth_state;
    const verifierCookie = google_oauth_code_verifier;

    if (!stateCookie || !verifierCookie) {
      set.status = 500;
      return { error: 'Cookie configuration error' };
    }

    if (google_oauth_state) {
      google_oauth_state.set({
        value: state,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutes
        sameSite: 'lax',
      });
    }

    if (google_oauth_code_verifier) {
      google_oauth_code_verifier.set({
        value: codeVerifier,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: 'lax',
      });
    }

    set.redirect = url.toString();
  })
  .get('/google/callback', async ({ query, cookie: { google_oauth_state, google_oauth_code_verifier }, jwt, set }) => {
    const code = query.code;
    const state = query.state;
    const storedState = google_oauth_state?.value as string | undefined;
    const storedCodeVerifier = google_oauth_code_verifier?.value as string | undefined;

    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
      set.status = 400;
      return { error: 'Invalid OAuth state', code: 'INVALID_STATE' };
    }

    try {
      const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });
      const googleUser = (await response.json()) as {
        sub: string;
        name: string;
        given_name: string;
        family_name: string;
        picture: string;
        email: string;
        email_verified: boolean;
      };

      // Find or create user
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      
      if (!AuthService.isEmailAllowed(googleUser.email)) {
        set.redirect = `${clientUrl}/#/login?error=restricted_demo`;
        return;
      }

      let user = await AuthService.findByEmail(googleUser.email);
      if (!user) {
        user = await AuthService.createUser({
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          provider: 'google',
          providerUserId: googleUser.sub,
        });
      }

      const userWithSub = await AuthService.getUserWithSubscription(user.id);
      if (!userWithSub) {
        set.status = 500;
        return { error: 'Failed to retrieve user' };
      }

      const token = await jwt.sign({
        userId: userWithSub.id,
        email: userWithSub.email,
        role: userWithSub.role,
      });

      // Redirect back to frontend with token
      set.redirect = `${clientUrl}/#/login?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: userWithSub.id,
        email: userWithSub.email,
        name: userWithSub.name,
        role: userWithSub.role,
        subscriptionStatus: userWithSub.subscriptionStatus,
      }))}`;
    } catch (error) {
      console.error('Google OAuth Error:', error);
      set.status = 500;
      return { error: 'Internal server error during OAuth', code: 'INTERNAL_SERVER_ERROR' };
    }
  })
  .post(
    '/register',
    async ({ body, set }) => {
      if (!AuthService.isEmailAllowed(body.email)) {
        set.status = 403;
        return { error: 'This demo is restricted to allowed email addresses only.', code: 'RESTRICTED_DEMO' };
      }

      const existingUser = await AuthService.findByEmail(body.email);
      if (existingUser) {
        set.status = 400;
        return { error: 'User already exists', code: 'USER_EXISTS' };
      }

      const user = await AuthService.createUser({
        email: body.email,
        password: body.password,
        name: body.name,
        provider: 'email',
        providerUserId: body.email,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionStatus: 'inactive',
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        name: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/login',
    async ({ body, jwt, set }) => {
      if (!AuthService.isEmailAllowed(body.email)) {
        set.status = 403;
        return { error: 'This demo is restricted to allowed email addresses only.', code: 'RESTRICTED_DEMO' };
      }

      const user = await AuthService.findByEmail(body.email);
      if (!user || !user.passwordHash) {
        set.status = 401;
        return { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
      }

      const isValid = await AuthService.verifyPassword(
        body.password,
        user.passwordHash,
      );
      if (!isValid) {
        set.status = 401;
        return { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
      }

      const userWithSub = await AuthService.getUserWithSubscription(user.id);
      if (!userWithSub) {
        set.status = 500;
        return { error: 'Failed to retrieve user details' };
      }

      const token = await jwt.sign({
        userId: userWithSub.id,
        email: userWithSub.email,
        role: userWithSub.role,
      });

      return {
        token,
        user: {
          id: userWithSub.id,
          email: userWithSub.email,
          name: userWithSub.name,
          role: userWithSub.role,
          subscriptionStatus: userWithSub.subscriptionStatus,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    },
  )
  .get('/me', async ({ user, set }: { user: any; set: any }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized - No user found', code: 'UNAUTHORIZED' };
    }
    
    const userWithSub = await AuthService.getUserWithSubscription(user.userId);
    if (!userWithSub) {
      set.status = 401;
      return { error: 'Unauthorized - No subscription found', code: 'UNAUTHORIZED' };
    }
    
    return userWithSub;
  }, {
    isAuthenticated: true
  });
