import { Elysia, t } from 'elysia';
import { AuthService } from '../services/auth-service';
import { authGuard } from '../middleware/auth-guard';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authGuard)
  .post(
    '/register',
    async ({ body, set }) => {
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

      const token = await jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
  .get('/me', ({ user, set }: { user: JWTPayload | null, set: any }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }
    return user;
  }, {
    isAuthenticated: true
  });
