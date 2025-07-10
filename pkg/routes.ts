import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { APP_START_TIME, ACCESS_KEY } from '@/env';

import { z } from 'zod';
import { version } from '#package';
import { format } from 'timeago.js';
import { nanoid, formatFile } from '@/helpers';
import { zValidator } from '@hono/zod-validator';
import { getFiles, getFile, getMetadata, createFile } from '@/database';

export const cdn = new Hono();

const ListQuerySchema = z.object({
  search: z.string().default(''),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['date', 'name', 'size']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const UploadQuerySchema = z.object({
  q: z.enum(['private', 'public']).default('public')
});

cdn.get('/', zValidator('query', ListQuerySchema), async c => {
  const query = c.req.valid('query');
  const { filesList, totalCount, totalPages, page, limit, sortBy, sortOrder, search } = await getFiles(query);
  const hostname = c.req.header('host') === 'themackabu.dev' ? 'https://themackabu.dev/cdn' : `https://${c.req.header('host')}`;

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
  const uptimeDate = new Date(APP_START_TIME);

  return c.json({
    version,
    uptime: Bun.nanoseconds(),
    started_at: format(uptimeDate)
  });
});

cdn.get('/:id/:name', async c => {
  const { id, name } = c.req.param();

  const file = await getFile(id, name);
  if (!file) return c.notFound();

  const bunFile = Bun.file(`files/${id}-${name}`);

  const exists = await bunFile.exists();
  if (!exists) return c.notFound();

  c.header('Content-disposition', `attachment; filename=${encodeURIComponent(file.name)}`);
  return c.body(bunFile.stream(), 200);
});

cdn.get('/:id', async c => {
  const { id } = c.req.param();
  const hostname = c.req.header('host') === 'themackabu.dev' ? 'https://themackabu.dev/cdn' : `https://${c.req.header('host')}`;

  const file = await getMetadata(id);
  if (!file) return c.notFound();

  return c.json(formatFile(file, hostname));
});

cdn.post('/:name', bearerAuth({ token: ACCESS_KEY }), zValidator('query', UploadQuerySchema), async c => {
  const query = c.req.valid('query');
  const { name } = c.req.param();
  const hostname = c.req.header('host') === 'themackabu.dev' ? 'https://themackabu.dev/cdn' : `https://${c.req.header('host')}`;

  const body = await c.req.arrayBuffer();
  if (!body) return c.text('missing body :(', 401);

  const randomId = nanoid();
  const isPrivate = query.q === 'private';
  const filePath = `files/${randomId}-${name}`;

  await Bun.write(filePath, body);

  const bunFile = Bun.file(filePath);
  const fileSize = bunFile.size;

  const fileData = {
    id: randomId,
    name: name,
    size: fileSize,
    private: isPrivate
  };

  const createdFile = await createFile(fileData);
  if (!createdFile) return c.text('failed entry :(', 500);

  return c.json(formatFile(createdFile, hostname));
});
