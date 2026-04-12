import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { authProviders, subscriptions, users } from '../db/schema';

export interface RegisterInput {
  email: string;
  password?: string;
  name?: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'apple';
  providerUserId: string;
}

export const AuthService = {
  isEmailAllowed(email: string): boolean {
    const allowedEmailsStr = process.env.ALLOWED_DEMO_EMAILS;
    if (!allowedEmailsStr) return true;

    const allowedEmails = allowedEmailsStr
      .split(',')
      .map((e) => e.trim().toLowerCase());
    return allowedEmails.includes(email.toLowerCase());
  },

  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email) as any)
      .limit(1);
    return user;
  },

  async findByProvider(provider: string, providerUserId: string) {
    const [authProvider] = await db
      .select()
      .from(authProviders)
      .where(
        and(
          eq(authProviders.provider, provider),
          eq(authProviders.providerUserId, providerUserId),
        ) as any,
      )
      .limit(1);

    if (!authProvider) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authProvider.userId) as any)
      .limit(1);

    return user;
  },

  async createUser(input: RegisterInput) {
    const userId = uuidv4();
    const newUser = {
      id: userId,
      email: input.email,
      name: input.name || null,
      avatarUrl: input.avatarUrl || null,
      passwordHash: input.password
        ? await Bun.password.hash(input.password)
        : null,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(users).values(newUser);

    await db.insert(authProviders).values({
      id: uuidv4(),
      userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
    });

    return newUser;
  },

  async verifyPassword(password: string, hash: string) {
    return await Bun.password.verify(password, hash);
  },

  async getUserById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id) as any)
      .limit(1);
    return user;
  },

  async getUserWithSubscription(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId) as any)
      .limit(1);
    if (!user) return null;

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId) as any)
      .limit(1);

    return {
      ...user,
      subscriptionStatus: sub?.status || 'inactive',
    };
  },
};
