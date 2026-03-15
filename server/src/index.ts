import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { Elysia } from 'elysia';
import { errorHandler } from './middleware/error-handler';
import { logger } from './middleware/logger';
import { videoProcessingEvents } from './queue/events';
import { jobsRoutes } from './routes/jobs';
import { projectsRoutes } from './routes/projects';
import { uploadRoutes } from './routes/upload';

// Log that we've initialized the events listener
console.log('📡 Job event listener initialized');
console.log(`📡 Queue: ${videoProcessingEvents.name}`);

const app = new Elysia()
  .use(cors())
  .use(logger)
  .use(errorHandler)
  .use(staticPlugin({
    assets: '../storage',
    prefix: '/storage'
  }))

  // Health checks
  .get('/healthz', () => ({ status: 'ok' }))
  .get('/readyz', () => ({ status: 'ready' }))

  // Mount API groups
  .group('/api', (app) =>
    app.use(projectsRoutes).use(uploadRoutes).use(jobsRoutes),
  );

app.listen(process.env.PORT || 3000);

console.log(
  `🦊 Content Engine API is running at ${app.server?.hostname}:${app.server?.port}`,
);
