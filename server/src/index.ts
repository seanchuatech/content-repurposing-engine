import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
  .use(cors())
  .get('/healthz', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/readyz', () => ({ status: 'ready' }))
  .listen(process.env.PORT || 3000);

console.log(`🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`);
