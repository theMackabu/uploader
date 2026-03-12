import * as schema from '@/schema';
import type { File } from '@/schema';
import type { Database, Bindings } from '@/env';

import { drizzle } from 'drizzle-orm/d1';
import { count, like, asc, desc, eq, and } from 'drizzle-orm';

export function createDb(d1: D1Database): Database {
  return drizzle(d1, { schema, casing: 'snake_case' });
}

interface GetFiles {
  search: string;
  page: number;
  limit: number;
  accessToken?: string;
  accessKey: string;

  sortOrder: 'asc' | 'desc';
  sortBy: 'date' | 'name' | 'size';
  view: 'public' | 'private';
}

export async function getFiles(db: Database, query: GetFiles) {
  const { page, limit, sortBy, sortOrder, search, accessToken, accessKey, view } = query;

  const sortColumn = schema.files[sortBy] || schema.files.date;
  const orderCondition = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const decodedToken = accessToken ? decodeURIComponent(accessToken) : '';
  const showPrivate = view === 'private' && decodedToken === accessKey;
  const conditions = [eq(schema.files.private, showPrivate)];

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

export async function getMetadata(db: Database, id: string) {
  const file = await db.select().from(schema.files).where(eq(schema.files.id, id)).limit(1);
  return file.at(0) ?? null;
}

export async function getFile(db: Database, id: string, name: string) {
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

export async function createFile(db: Database, file: Omit<File, 'date'>) {
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
