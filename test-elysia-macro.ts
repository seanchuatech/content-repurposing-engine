import { Elysia } from 'elysia';

const guard = new Elysia({ name: 'guard' })
  .macro(({ onBeforeHandle }) => ({
    isAuthenticated(value: boolean) {
      if (!value) return;
      onBeforeHandle(({ set }) => {
        console.log('MACRO EXECUTED!');
        set.status = 401;
        return { error: 'Macro unauthorized' };
      });
    },
  }))
  .derive(() => ({ user: null }));

const app = new Elysia()
  .use(guard)
  .get('/', ({ user }) => ({ msg: 'handler' }), { isAuthenticated: true });

app.handle(new Request('http://localhost/')).then(async (res) => {
  console.log(res.status, await res.json());
});
