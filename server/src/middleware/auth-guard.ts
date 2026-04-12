import { jwt } from '@elysiajs/jwt';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { subscriptions, users } from '../db/schema';
import type { JWTPayload } from '../types/auth';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing in production');
}

export const authGuard = new Elysia({ name: 'authGuard' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET!,
    }),
  )
  .derive(
    { as: 'global' },
    async ({ jwt, headers: { authorization }, query }) => {
      let token = '';

      if (authorization?.startsWith('Bearer ')) {
        token = authorization.split(' ')[1];
      } else if (query?.token) {
        token = query.token as string;
      }

      if (!token) {
        return { user: null };
      }

      const payload = (await jwt.verify(token)) as unknown as JWTPayload;

      if (!payload || !payload.userId) {
        return { user: null };
      }

      // Optionally: Fetch full user from DB if needed for every request
      // or just pass the payload. For now, let's just pass the payload
      // to keep it fast, and only fetch DB when role verification or
      // sub verification is explicitly needed.
      return {
        user: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        },
      };
    },
  )
  .macro({
    isAuthenticated(value: boolean) {
      if (!value) return;

      return {
        beforeHandle({ user, set }: { user: JWTPayload | null; set: any }) {
          if (!user) {
            set.status = 401;
            return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
          }
        },
      };
    },
    requireSubscription(value: boolean) {
      if (!value) return;

      return {
        async beforeHandle({
          user,
          set,
        }: { user: JWTPayload | null; set: any }) {
          if (!user) {
            set.status = 401;
            return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
          }

          // Admins bypass subscription check
          if (user.role === 'admin') return;

          // Check subscription status
          const sub = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, user.userId))
            .limit(1);

          const status = sub[0]?.status || 'inactive';
          if (status !== 'active' && status !== 'trialing') {
            set.status = 403;
            return {
              error: 'Subscription Required',
              message:
                'An active subscription is required to access this feature.',
              code: 'SUBSCRIPTION_REQUIRED',
            };
          }
        },
      };
    },
  });
