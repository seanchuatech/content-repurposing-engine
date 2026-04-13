import { Elysia } from 'elysia';

const guard = new Elysia({ name: 'authGuard' }).macro({
  isAuthenticated(value: boolean) {
    if (!value) return;
    return {
      beforeHandle() {
        console.log('MACRO EXECUTED!');
        return new Response('Unauthorized', { status: 401 });
      },
    };
  },
});

const app = new Elysia().use(guard).get(
  '/me',
  () => {
    return { data: 'hello' };
  },
  { isAuthenticated: true },
);

app.handle(new Request('http://localhost/me')).then(async (res) => {
  console.log('App Status:', res.status, await res.text());
});
