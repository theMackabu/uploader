import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { cdn } from '@/routes';
import type { Bindings } from '@/env';

const server = new Hono<{ Bindings: Bindings }>();

server.route('/', cdn);
server.notFound(c => c.text('not found :(', 404));

server.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.text(err.message, err.status);
  }

  console.error(err);
  return c.text(err.message, 500);
});

export default server;
