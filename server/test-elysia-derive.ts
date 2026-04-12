import { Elysia } from 'elysia';

const guard = new Elysia({ name: 'authGuard' })
  .derive({ as: 'global' }, async () => {
    console.log('running derive');
    return { user: { id: 1 } };
  })
  .macro({
    isAuthenticated(value: boolean) {
      if (!value) return;
      return {
        beforeHandle({
          user,
          set,
        }: { user: unknown; set: { status?: number | string } }) {
          console.log('MACRO EXECUTED! User: ', user);
          if (!user) {
            set.status = 401;
            return { error: 'Macro unauthorized' };
          }
        },
      };
    },
  });

const app = new Elysia().use(guard).get(
  '/me',
  ({ user }) => {
    return { data: 'hello', user };
  },
  { isAuthenticated: true },
);

app.handle(new Request('http://localhost/me')).then(async (res) => {
  console.log('App Status:', res.status, await res.text());
});
