import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import type Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { stripeEvents, subscriptions } from '../db/schema';
import { stripe } from '../lib/stripe';

export const webhookRoutes = new Elysia({ prefix: '/webhooks' }).post(
  '/stripe',
  async ({
    request,
    set,
    headers,
  }: {
    request: Request;
    set: { status?: number | string };
    headers: Record<string, string | undefined>;
  }) => {
    const signature = headers['stripe-signature'];
    console.log('Stripe-Signature Header:', signature);
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
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const error = err as Error;
      console.error(`Webhook signature verification failed: ${error.message}`);
      set.status = 400;
      return { error: 'Webhook verification failed' };
    }

    console.log(`Processing Stripe event: ${event.type} (${event.id})`);

    // 1. Idempotency Check: Prevent duplicate processing
    const [existingEvent] = await db
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.id, event.id))
      .limit(1);

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, skipping.`);
      return { received: true, duplicate: true };
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const stripeCustomerId = session.customer as string;
          const stripeSubscriptionId = session.subscription as string;

          if (userId && stripeCustomerId) {
            const [existing] = await db
              .select()
              .from(subscriptions)
              .where(eq(subscriptions.userId, userId))
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
                .where(eq(subscriptions.userId, userId));
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
          const subscription = event.data.object as Stripe.Subscription;
          const status = subscription.status;
          const stripeSubscriptionId = subscription.id;

          await db
            .update(subscriptions)
            .set({
              status,
              currentPeriodEnd: new Date(
                (subscription as any).current_period_end * 1000,
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              updatedAt: new Date(),
            })
            .where(
              eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
            );
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const stripeSubscriptionId = (invoice as any).subscription as string;

          if (stripeSubscriptionId) {
            await db
              .update(subscriptions)
              .set({
                status: 'active',
                updatedAt: new Date(),
              })
              .where(
                eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
              );
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const stripeSubscriptionId = (invoice as any).subscription as string;

          if (stripeSubscriptionId) {
            await db
              .update(subscriptions)
              .set({
                status: 'past_due',
                updatedAt: new Date(),
              })
              .where(
                eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
              );
          }
          break;
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          const stripeSubscriptionId = subscription.id;
          const status = subscription.status;

          // This is a backup in case checkout.session.completed was missed or delayed
          const [existing] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
            .limit(1);

          if (!existing) {
            console.log(
              `Subscription ${stripeSubscriptionId} created, but not found in DB. Manual intervention or delayed sync might be needed if userId is unknown.`,
            );
            // Note: Without userId we can't easily create the record here unless we lookup by customerId
          } else {
            await db
              .update(subscriptions)
              .set({ status, updatedAt: new Date() })
              .where(
                eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
              );
          }
          break;
        }

        case 'invoice.payment_action_required': {
          const invoice = event.data.object as Stripe.Invoice;
          const stripeSubscriptionId = (invoice as any).subscription as string;

          if (stripeSubscriptionId) {
            await db
              .update(subscriptions)
              .set({
                status: 'incomplete', // Requires user action (e.g., 3D Secure)
                updatedAt: new Date(),
              })
              .where(
                eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
              );
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // 2. Mark event as processed for idempotency
      await db.insert(stripeEvents).values({
        id: event.id,
        type: event.type,
        processedAt: new Date(),
      });

      return { received: true };
    } catch (err) {
      const error = err as Error;
      console.error(`Error processing webhook event: ${error.message}`);
      set.status = 500;
      return { error: 'Webhook processing error' };
    }
  },
);
