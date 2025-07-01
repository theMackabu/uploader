import { PORT } from '@/env';
import { cdn } from '@/routes';
import { init } from '@/database';
import { logger } from 'hono/logger';

const server = await init();

server.use(logger());
server.route('/', cdn);

server.notFound(c => c.text('not found :(', 404));

server.onError((err, res) => {
  console.error(err);
  return res.text(err.message, 500);
});

export default {
  port: PORT,
  fetch: server.fetch,
  development: false
};
