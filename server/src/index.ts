import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { rateLimit } from 'elysia-rate-limit';
import { Elysia } from 'elysia';
import { errorHandler } from './middleware/error-handler';
import { logger } from './middleware/logger';
import { authGuard } from './middleware/auth-guard';
import { authRoutes } from './routes/auth';
import { billingRoutes } from './routes/billing';
import { webhookRoutes } from './routes/webhooks';
import { downloadRoutes } from './routes/download';
import { jobsRoutes } from './routes/jobs';
import { projectsRoutes } from './routes/projects';
import { settingsRoutes } from './routes/settings';
import { uploadRoutes } from './routes/upload';

const app = new Elysia()
  .use(cors())
  .use(logger)
  .use(
    rateLimit({
      max: Number(process.env.RATE_LIMIT_MAX) || 100,
      duration: 60000,
      errorResponse: 'Too Many Requests',
    }),
  )
  .use(errorHandler)
  .use(authGuard) // Register JWT and Derivations

if (process.env.STORAGE_BACKEND !== 's3') {
  app.use(
    staticPlugin({
      assets: '../storage',
      prefix: '/storage',
    }),
  )
}

app
  // Health checks
  .get('/healthz', () => ({ status: 'ok' }))
  .get('/readyz', () => ({ status: 'ready' }))

  // Mount API groups
  .use(webhookRoutes) // Stripe webhooks (public)
  .group('/api', (app) =>
    app
      .use(authRoutes) // Public auth routes (internal guards handle protection)
      .use(billingRoutes) // Billing routes (internal guards handle protection)
      .guard({ isAuthenticated: true, requireSubscription: true }, (protectedApp) =>
        protectedApp
          .use(projectsRoutes)
          .use(uploadRoutes)
          .use(jobsRoutes)
          .use(settingsRoutes)
          .use(downloadRoutes),
      ),
  );

app.listen(process.env.PORT || 3000);

console.log(
  `🦊 Content Engine API is running at ${app.server?.hostname}:${app.server?.port}`,
);
