import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';

const app = new Elysia()
  .use(jwt({ name: 'jwt', secret: 'test' }))
  .get('/test', async ({ jwt }) => {
    const token = await jwt.sign({ userId: '123' });
    const verified = await jwt.verify(token);
    return { token, verified };
  });

app
  .handle(new Request('http://localhost/test'))
  .then(async (res) => console.log(await res.json()));
