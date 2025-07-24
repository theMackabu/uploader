import * as schema from '@/schema';

import { Hono } from 'hono';
import { Database } from 'bun:sqlite';
import type { File } from '@/schema';

import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { count, like, asc, desc, eq, and } from 'drizzle-orm';

const client = new Database('files.sqlite');

export const db = drizzle({
  schema,
  client: client,
  casing: 'snake_case'
});

export async function init() {
  migrate(db, { migrationsFolder: './drizzle' });

  const exists = await Bun.file('files').exists();
  if (!exists) await Bun.write('files/.gitkeep', '');

  return new Hono();
}

interface GetFiles {
  search: string;
  page: number;
  limit: number;

  sortOrder: 'asc' | 'desc';
  sortBy: 'date' | 'name' | 'size';
}

export async function getFiles(query: GetFiles) {
  const { page, limit, sortBy, sortOrder, search } = query;

  const sortColumn = schema.files[sortBy] || schema.files.date;
  const orderCondition = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const conditions = [eq(schema.files.private, false)];
  if (search) conditions.push(like(schema.files.name, `%${search}%`));

  const filesList = await db
    .select()
    .from(schema.files)
    .where(and(...conditions))
    .orderBy(orderCondition)
    .limit(limit)
    .offset((page - 1) * limit);

  const countResult = await db
    .select({
      totalCount: count()
    })
    .from(schema.files)
    .where(and(...conditions));

  const totalCount = countResult.at(0)?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  return { filesList, totalCount, totalPages, ...query };
}

export async function getMetadata(id: string) {
  const file = await db.select().from(schema.files).where(eq(schema.files.id, id)).limit(1);
  return file.at(0) ?? null;
}

export async function getFile(id: string, name: string) {
  const file = await db
    .select({
      id: schema.files.id,
      name: schema.files.name
    })
    .from(schema.files)
    .where(and(eq(schema.files.id, id), eq(schema.files.name, name)))
    .limit(1);

  return file.at(0) ?? null;
}

export async function createFile(file: Omit<File, 'date'>) {
  const newFile = await db
    .insert(schema.files)
    .values({
      id: file.id,
      name: file.name,
      size: file.size,
      date: new Date(),
      private: file.private
    })
    .returning();

  return newFile.at(0) ?? null;
}
