import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { authProviders, users } from '../db/schema';

export interface RegisterInput {
  email: string;
  password?: string;
  name?: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'apple';
  providerUserId: string;
}

export const AuthService = {
  /**
   * Find a user by their email
   */
  async findByEmail(email: string) {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return results[0] || null;
  },

  /**
   * Find a user by OAuth provider and their unique ID in that provider
   */
  async findByProvider(provider: string, providerUserId: string) {
    const results = await db
      .select({
        user: users,
      })
      .from(authProviders)
      .innerJoin(users, eq(authProviders.userId, users.id))
      .where(
        and(
          eq(authProviders.provider, provider),
          eq(authProviders.providerUserId, providerUserId),
        ),
      )
      .limit(1);

    return results[0]?.user || null;
  },

  /**
   * Create a new user and their initial auth provider entry
   */
  async createUser(input: RegisterInput) {
    const userId = uuidv4();
    const passwordHash = input.password
      ? await Bun.password.hash(input.password)
      : null;

    return await db.transaction(async (tx) => {
      // 1. Create Core User
      const [user] = await tx
        .insert(users)
        .values({
          id: userId,
          email: input.email.toLowerCase(),
          passwordHash,
          name: input.name,
          avatarUrl: input.avatarUrl,
          role: 'user',
        })
        .returning();

      // 2. Link Auth Provider
      await tx.insert(authProviders).values({
        id: uuidv4(),
        userId: user.id,
        provider: input.provider,
        providerUserId: input.providerUserId,
      });

      // 3. Initialize Settings
      // TODO: Add default settings initialization if needed

      if (!user) {
        throw new Error('Failed to create user');
      }

      return user;
    });
  },


  /**
   * Verify email/password login
   */
  async verifyPassword(password: string, hash: string) {
    return await Bun.password.verify(password, hash);
  },
};
