import type { InferSelectModel } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const files = sqliteTable('files', {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  size: integer().notNull(),
  date: integer({ mode: 'timestamp' }).notNull(),
  private: integer({ mode: 'boolean' }).notNull()
});

export type File = InferSelectModel<typeof files>;
