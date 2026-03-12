import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '@/schema';

export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ACCESS_KEY: string;
};

export type Database = DrizzleD1Database<typeof schema>;

let _appStartTime: number | null = null;
export function getAppStartTime(): number {
  if (_appStartTime === null) _appStartTime = Date.now();
  return _appStartTime;
}
