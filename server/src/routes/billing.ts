import { Elysia } from 'elysia';
import { authGuard } from '../middleware/auth-guard';
import { stripe } from '../lib/stripe';
import { db } from '../db/client';
import { subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';

export const billingRoutes = new Elysia({ prefix: '/billing' })
  .use(authGuard)
  .post(
    '/create-checkout-session',
    async (ctx: any) => {
      const { user, set } = ctx;
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        set.status = 500;
        return { error: 'Stripe Price ID not configured' };
      }

      // Check if user already has a Stripe Customer ID
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.userId) as any)
        .limit(1);

      const customerId = existingSub?.stripeCustomerId;

      const session = await stripe.checkout.sessions.create({
        customer: customerId || undefined,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings`,
        metadata: {
          userId: user.userId,
        },
      });

      return { url: session.url };
    },
    {
      isAuthenticated: true,
    },
  )
  .post(
    '/create-portal-session',
    async (ctx: any) => {
      const { user, set } = ctx;
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.userId) as any)
        .limit(1);

      if (!sub || !sub.stripeCustomerId) {
        set.status = 400;
        return { error: 'No active subscription or customer found' };
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings`,
      });

      return { url: session.url };
    },
    {
      isAuthenticated: true,
    },
  );
