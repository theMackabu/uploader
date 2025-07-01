import { PORT } from '@/env';
import { HTTPException } from 'hono/http-exception';

import { cdn } from '@/routes';
import { init } from '@/database';
import { logger } from 'hono/logger';

const server = await init();

server.use(logger());
server.route('/', cdn);

server.notFound(c => c.text('not found :(', 404));

server.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.text(err.message, err.status);
  }

  console.error(err);
  return c.text(err.message, 500);
});

export default {
  port: PORT,
  fetch: server.fetch,
  development: false
};
