import { Elysia } from 'elysia';
import { stripe } from '../lib/stripe';
import { db } from '../db/client';
import { subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type Stripe from 'stripe';

export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
  .post(
    '/stripe',
    async (ctx: any) => {
      const { request, set, headers } = ctx;
      const signature = headers['stripe-signature'];
      if (!signature) {
        set.status = 400;
        return { error: 'No stripe-signature header' };
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is not set');
        set.status = 500;
        return { error: 'Webhook secret not configured' };
      }

      const body = await request.text();
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        set.status = 400;
        return { error: 'Webhook verification failed' };
      }

      console.log(`Processing Stripe event: ${event.type}`);

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as any;
            const userId = session.metadata?.userId;
            const stripeCustomerId = session.customer as string;
            const stripeSubscriptionId = session.subscription as string;

            if (userId && stripeCustomerId) {
              const [existing] = await db
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.userId, userId) as any)
                .limit(1);

              if (existing) {
                await db
                  .update(subscriptions)
                  .set({
                    stripeCustomerId,
                    stripeSubscriptionId,
                    status: 'active', 
                    updatedAt: new Date(),
                  })
                  .where(eq(subscriptions.userId, userId) as any);
              } else {
                await db.insert(subscriptions).values({
                  id: uuidv4(),
                  userId,
                  stripeCustomerId,
                  stripeSubscriptionId,
                  status: 'active',
                });
              }
            }
            break;
          }

          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            const subscription = event.data.object as any;
            const status = subscription.status;
            const stripeSubscriptionId = subscription.id;

            await db
              .update(subscriptions)
              .set({
                status,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId) as any);
            break;
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object as any;
            const stripeSubscriptionId = invoice.subscription as string;
            
            if (stripeSubscriptionId) {
              await db
                .update(subscriptions)
                .set({
                  status: 'active',
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId) as any);
            }
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as any;
            const stripeSubscriptionId = invoice.subscription as string;
            
            if (stripeSubscriptionId) {
              await db
                .update(subscriptions)
                .set({
                  status: 'past_due',
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId) as any);
            }
            break;
          }

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
      } catch (err: any) {
        console.error(`Error processing webhook event: ${err.message}`);
        set.status = 500;
        return { error: 'Webhook processing error' };
      }
    }
  );
