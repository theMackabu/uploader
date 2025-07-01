import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  dialect: 'sqlite',
  schema: './pkg/schema.ts'
});
