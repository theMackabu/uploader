import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { getAppStartTime } from '@/env';
import type { Bindings, Database } from '@/env';

import { z } from 'zod';
import { version } from '#package';
import { format } from 'timeago.js';
import { nanoid, formatFile } from '@/helpers';
import { zValidator } from '@hono/zod-validator';
import { getFiles, getFile, getMetadata, createFile, createDb } from '@/database';

type Env = { Bindings: Bindings; Variables: { db: Database } };

export const cdn = new Hono<Env>();

cdn.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});

const ListQuerySchema = z.object({
  search: z.string().default(''),
  accessToken: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sortBy: z.enum(['date', 'name', 'size']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  view: z.enum(['private', 'public']).default('public')
});

const ViewQuerySchema = z.object({
  content: z.enum(['inline', 'attachment']).default('attachment')
});

const UploadQuerySchema = z.object({
  q: z.enum(['private', 'public']).default('public')
});

cdn.get('/', zValidator('query', ListQuerySchema), async c => {
  const query = c.req.valid('query');
  const db = c.get('db');
  const hostname = c.req.header('host') === 'themackabu.dev' ? 'https://themackabu.dev/cdn' : `https://${c.req.header('host')}`;

  const { filesList, totalCount, totalPages, page, limit, sortBy, sortOrder, search } = await getFiles(db, {
    ...query,
    accessKey: c.env.ACCESS_KEY
  });

  return c.json({
    files: filesList.map(file => formatFile(file, hostname)),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    sorting: {
      sortBy,
      sortOrder
    },
    search: search || null
  });
});

cdn.get('/health', c => {
  const uptimeDate = new Date(getAppStartTime());

  return c.json({
    version,
    started_at: format(uptimeDate)
  });
});

cdn.get('/:id/:name', zValidator('query', ViewQuerySchema), async c => {
  const query = c.req.valid('query');
  const db = c.get('db');
  const { id, name } = c.req.param();

  const file = await getFile(db, id, name);
  if (!file) return c.notFound();

  const object = await c.env.BUCKET.get(`${id}-${name}`);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);

  if (query.content === 'attachment') {
    headers.set('Content-Disposition', `attachment; filename=${encodeURIComponent(file.name)}`);
  }

  return new Response(object.body, { headers });
});

cdn.get('/:id', async c => {
  const { id } = c.req.param();
  const db = c.get('db');
  const hostname = c.req.header('host') === 'themackabu.dev' ? 'https://themackabu.dev/cdn' : `https://${c.req.header('host')}`;

  const file = await getMetadata(db, id);
  if (!file) return c.notFound();

  return c.json(formatFile(file, hostname));
});

cdn.post(
  '/:name',
  async (c, next) => {
    const auth = bearerAuth({ token: c.env.ACCESS_KEY });
    return auth(c, next);
  },
  zValidator('query', UploadQuerySchema),
  async c => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const { name } = c.req.param();
    const hostname = c.req.header('host') === 'themackabu.dev' ? 'https://themackabu.dev/cdn' : `https://${c.req.header('host')}`;

    const body = await c.req.arrayBuffer();
    if (!body) return c.text('missing body :(', 401);

    const randomId = nanoid();
    const isPrivate = query.q === 'private';
    const key = `${randomId}-${name}`;

    await c.env.BUCKET.put(key, body);

    const fileData = {
      id: randomId,
      name: name,
      size: body.byteLength,
      private: isPrivate
    };

    const createdFile = await createFile(db, fileData);
    if (!createdFile) return c.text('failed entry :(', 500);

    return c.json(formatFile(createdFile, hostname));
  }
);
