import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Create Neon client
const sql = neon(process.env.NETLIFY_DATABASE_URL!);

// Create Drizzle instance with Neon client
export const db = drizzle({
  schema,
  client: sql,
});

// Export schema for use in other files
export { schema };
export * from './schema';